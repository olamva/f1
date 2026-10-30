import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { merge } from "../shared/merge.ts";
import type {
  LapPositions,
  Practice,
  Qualifying,
  Stints,
} from "../shared/season.ts";
import {
  lapSeconds,
  type FastestLaps,
  type Outline,
  type SessionRef,
} from "../shared/timing.ts";
import circuits from "./circuits.json" with { type: "json" };
import { DATA_DIR, readJson, writeJson } from "./data.ts";
import { get } from "./jolpica.ts";
import { archive } from "./origin.ts";
import {
  expand,
  parseLine,
  Session,
  TOPICS,
  unpack,
  type Event,
  type State,
} from "./timing.ts";

const CHECKPOINT_MS = 30_000;

const text = async (path: string): Promise<string> => {
  const res = await archive(path);
  if (res.status === 401)
    throw new Error(
      "The F1 archive needs a valid F1TV token. Save a new token in Settings.",
    );
  if (!res.ok) throw new Error(`archive ${res.status} ${path}`);
  return res.text();
};

const json = async (path: string): Promise<any> =>
  JSON.parse((await text(path)).replace(/^﻿/, ""));

const local = (date: string, offset: string) =>
  `${date}${offset.startsWith("-") ? "" : "+"}${offset.replace(/:\d\d$/, "")}`;

export async function seasonSessions(year: number): Promise<SessionRef[]> {
  const index = await json(`${year}/Index.json`);
  return index.Meetings.flatMap((m: any) =>
    m.Sessions.filter(
      (s: any) =>
        s.Path || Date.parse(local(s.EndDate, s.GmtOffset)) < Date.now(),
    ).map((s: any) => ({
      path: s.Path ?? "",
      meeting: m.Name,
      country: m.Country?.Name ?? "",
      name: (s.Name ?? s.Type).replace(/^Practice /, "FP"),
      start: local(s.StartDate, s.GmtOffset),
    })),
  );
}

const SESSIONS = {
  race: { label: "Race", name: /^Race$/, event: (r: any) => r },
  sprint: {
    label: "Sprint",
    name: /^Sprint(?: Race)?$/,
    event: (r: any) => r?.Sprint,
  },
  qualifying: {
    label: "Qualifying",
    name: /^Qualifying$/,
    event: (r: any) => r?.Qualifying,
  },
  sprintQualifying: {
    label: "Sprint qualifying",
    name: /^Sprint (?:Qualifying|Shootout)$/,
    event: (r: any) => r?.SprintQualifying ?? r?.SprintShootout,
  },
  fp1: {
    label: "Practice 1",
    name: /^FP1$/,
    event: (r: any) => r?.FirstPractice,
  },
  fp2: {
    label: "Practice 2",
    name: /^FP2$/,
    event: (r: any) => r?.SecondPractice,
  },
  fp3: {
    label: "Practice 3",
    name: /^FP3$/,
    event: (r: any) => r?.ThirdPractice,
  },
};

export async function sessionPath(
  year: number,
  round: number,
  kind: keyof typeof SESSIONS,
): Promise<string> {
  const { label, name, event: pick } = SESSIONS[kind];
  const event = pick((await get(`${year}/${round}.json`)).RaceTable.Races[0]);
  if (!event) throw new Error(`${label} is not available for this round`);
  const start = Date.parse(`${event.date}T${event.time ?? "00:00:00Z"}`);
  const away = (s: SessionRef) => Math.abs(Date.parse(s.start) - start);
  const match = (await seasonSessions(year))
    .filter((s) => name.test(s.name) && s.path)
    .sort((a, b) => away(a) - away(b))[0];
  if (!match || away(match) > 24 * 60 * 60_000)
    throw new Error(`${label} timing is not available yet`);
  return match.path;
}

export async function stints(
  year: number,
  round: number,
  kind: "race" | "sprint",
): Promise<Stints> {
  const path = await sessionPath(year, round, kind);
  const data = await json(`${path}TyreStintSeries.json`);
  return Object.fromEntries(
    Object.entries(data.Stints ?? {}).map(([number, list]) => {
      let lap = 0;
      return [
        number,
        Object.values(list as any[]).flatMap((s) => {
          const laps = s.TotalLaps - s.StartLaps;
          if (!(laps > 0)) return [];
          lap += laps;
          return [
            {
              compound: s.Compound,
              new: s.New === "true",
              from: lap - laps + 1,
              to: lap,
            },
          ];
        }),
      ];
    }),
  );
}

export async function positions(
  year: number,
  round: number,
  kind: "race" | "sprint",
): Promise<LapPositions> {
  const path = await sessionPath(year, round, kind);
  const data = await json(`${path}LapSeries.json`);
  return Object.fromEntries(
    Object.entries(data ?? {}).map(([number, line]: [string, any]) => [
      number,
      (line.LapPosition ?? []).map(Number),
    ]),
  );
}

export async function qualifying(
  year: number,
  round: number,
  kind: "race" | "sprint",
): Promise<Qualifying> {
  const path = await sessionPath(
    year,
    round,
    kind === "race" ? "qualifying" : "sprintQualifying",
  );
  const data = await json(`${path}TimingData.json`);
  return Object.entries(data.Lines ?? {})
    .map(([number, line]: [string, any]) => ({
      number,
      position: Number(line.Position),
      times: [0, 1, 2].map((part) => line.BestLapTimes?.[part]?.Value || null),
    }))
    .sort((a, b) => a.position - b.position);
}

export async function practice(
  year: number,
  round: number,
  kind: "fp1" | "fp2" | "fp3",
): Promise<Practice> {
  const path = await sessionPath(year, round, kind);
  const [timing, drivers] = await Promise.all([
    json(`${path}TimingData.json`),
    json(`${path}DriverList.json`),
  ]);
  return Object.entries(timing.Lines ?? {})
    .map(([number, line]: [string, any]) => ({
      number,
      position: Number(line.Position),
      name: drivers[number]
        ? `${drivers[number].FirstName} ${drivers[number].LastName}`
        : `#${number}`,
      team: drivers[number]?.TeamName ?? "",
      time: line.BestLapTime?.Value || null,
      gap: line.TimeDiffToFastest ?? "",
      laps: line.NumberOfLaps ?? 0,
    }))
    .sort((a, b) => a.position - b.position);
}

export type Replay = {
  path: string;
  events: Event[];
  duration: number;
  checkpoints: { t: number; index: number; state: State }[];
  session: Session;
};

const ROTATION: Record<number, number> = {
  2: 274,
  4: 308,
  46: 358,
  65: 9,
  144: 308,
  153: 270,
};

const circuit = (key: number, date: string): Outline | null => {
  const c = circuits.find(
    (c) => c.key === key && c.from <= date && date <= c.to,
  );
  return c
    ? {
        x: c.x,
        y: c.y,
        time: [],
        rotation: ROTATION[key] ?? 0,
        corners: c.corners,
        sectors: c.sectors,
        detection: c.detection,
        pit: c.pit,
        marshalSectors: [],
      }
    : null;
};

export async function outlineFor(
  info: any,
  fallback: () => Outline | null,
): Promise<Outline | null> {
  const key = info?.Meeting?.Circuit?.Key;
  const date = String(info?.StartDate ?? "").slice(0, 10);
  const year = Number(date.slice(0, 4));
  const bundled = key ? circuit(key, date) : null;
  if (key && year) {
    const res = await fetch(
      `https://api.multiviewer.app/api/v1/circuits/${key}/${year}`,
      {
        headers: { "User-Agent": "f1.ola-vassbotn.no" },
      },
    ).catch(() => null);
    if (res?.ok) {
      const c = await res.json();
      return {
        sectors: [],
        detection: null,
        pit: null,
        ...bundled,
        x: c.x,
        y: c.y,
        time: c.trackPositionTime ?? [],
        rotation: ROTATION[key] ?? c.rotation ?? 0,
        corners: (c.corners ?? []).map((k: any) => ({
          number: k.number,
          ...k.trackPosition,
        })),
        marshalSectors: (c.marshalSectors ?? []).map((k: any) => ({
          number: k.number,
          ...k.trackPosition,
        })),
        pitLoss:
          c.pitLoss &&
          Object.fromEntries(
            Object.entries(c.pitLoss).map(([k, v]) => [k, Number(v)]),
          ),
      };
    }
  }
  return bundled ?? fallback();
}

async function parse(path: string, topic: string): Promise<Event[]> {
  const res = await archive(`${path}${topic}.jsonStream`);
  if (!res.ok || !res.body) throw new Error(`archive ${res.status} ${path}`);
  const out: Event[] = [];
  for await (const line of createInterface({
    input: Readable.from(res.body),
    crlfDelay: Infinity,
  }))
    out.push(...parseLine(line, topic));
  return out;
}

async function load(path: string): Promise<Replay> {
  const streams: Event[][] = [];
  for (const topic of TOPICS)
    streams.push(await parse(path, topic).catch(() => []));
  const events: Event[] = [];
  const session = new Session();
  const checkpoints: Replay["checkpoints"] = [{ t: 0, index: 0, state: {} }];
  for (const e of streams.flat().sort((a, b) => a.t - b.t)) {
    if (e.t - checkpoints.at(-1)!.t >= CHECKPOINT_MS)
      checkpoints.push({
        t: e.t,
        index: events.length,
        state: { ...session.state },
      });
    const applied = unpack(e).flatMap((x) => session.apply(x));
    events.push(
      ...(e.topic.endsWith(".z")
        ? [e, ...applied.filter((x) => x.topic !== e.topic.slice(0, -2))]
        : applied),
    );
  }
  return {
    path,
    events,
    duration: events.at(-1)?.t ?? 0,
    checkpoints,
    session,
  };
}

async function loadFastest(path: string): Promise<FastestLaps> {
  const info = await json(`${path}SessionInfo.json`);
  if (info.ArchiveStatus?.Status !== "Complete")
    throw new Error("Lap telemetry is not available yet");
  const [list, ...streams] = await Promise.all([
    json(`${path}DriverList.json`),
    ...["TimingData", "Position.z", "CarData.z"].map((topic) =>
      parse(path, topic),
    ),
  ]);
  const session = new Session();
  for (const e of streams.flat().sort((a, b) => a.t - b.t))
    for (const x of unpack(e)) session.apply(x);
  session.traces.flush(Infinity, session.track);
  const lines = (session.state.TimingData as any)?.Lines ?? {};
  const drivers = Object.entries(session.traces.laps)
    .flatMap(([number, laps]) => {
      const lap = Object.values(laps).findLast(
        (l) => l.time === lines[number]?.BestLapTime?.Value,
      );
      const driver = list[number];
      return lap && driver
        ? [
            {
              number,
              tla: driver.Tla,
              name: driver.FullName,
              color: `#${driver.TeamColour ?? "888888"}`,
              lap,
            },
          ]
        : [];
    })
    .sort((a, b) => lapSeconds(a.lap.time)! - lapSeconds(b.lap.time)!);
  if (!drivers.length) throw new Error("Lap telemetry is not available");
  return { outline: await outlineFor(info, () => session.outline()), drivers };
}

async function storedFastest(
  year: number,
  round: number,
  kind: keyof typeof SESSIONS,
): Promise<FastestLaps> {
  const file = `fastest/v1/${year}/${round}/${kind}.json`;
  const hit = DATA_DIR && (await readJson(file).catch(() => null));
  if (hit) return hit;
  const result = await loadFastest(await sessionPath(year, round, kind));
  if (DATA_DIR)
    await writeJson(file, result).catch((e) =>
      console.error("fastest laps store write:", e),
    );
  return result;
}

const FASTEST_CACHED = 10;
const fastest = new Map<string, Promise<FastestLaps>>();

export function fastestLaps(
  year: number,
  round: number,
  kind: keyof typeof SESSIONS,
): Promise<FastestLaps> {
  const key = `${year}:${round}:${kind}`;
  const result = fastest.get(key) ?? storedFastest(year, round, kind);
  fastest.delete(key);
  fastest.set(key, result);
  result.catch(() => {
    if (fastest.get(key) === result) fastest.delete(key);
  });
  if (fastest.size > FASTEST_CACHED)
    fastest.delete(fastest.keys().next().value!);
  return result;
}

const CACHED = 2;
const cache = new Map<string, Promise<Replay>>();

export function replay(path: string): Promise<Replay> {
  if (!/^\d{4}\/[\w\-.]+\/[\w\-.]+\/$/.test(path)) throw new Error("bad path");
  const r = cache.get(path) ?? load(path);
  cache.delete(path);
  cache.set(path, r);
  r.catch(() => {
    if (cache.get(path) === r) cache.delete(path);
  });
  if (cache.size > CACHED) cache.delete(cache.keys().next().value!);
  return r;
}

export function stateAt(r: Replay, t: number): { state: State; index: number } {
  const cp = r.checkpoints.findLast((c) => c.t <= t) ?? r.checkpoints[0]!;
  const state: State = { ...cp.state };
  let i = cp.index;
  for (; i < r.events.length && r.events[i]!.t <= t; i++) {
    for (const e of expand(r.events[i]!))
      state[e.topic] = merge(state[e.topic], e.data);
  }
  return { state, index: i };
}
