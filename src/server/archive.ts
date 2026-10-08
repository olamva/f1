import { merge } from "../shared/merge.ts";
import type { Stints } from "../shared/season.ts";
import type { Outline, SessionRef } from "../shared/timing.ts";
import circuits from "./circuits.json" with { type: "json" };
import { get } from "./jolpica.ts";
import { F1_ORIGIN } from "./origin.ts";
import {
  expand,
  parseStream,
  Session,
  TOPICS,
  type Event,
  type State,
} from "./timing.ts";

const BASE = `${F1_ORIGIN}/static/`;
const CHECKPOINT_MS = 30_000;

const text = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`archive ${res.status} ${url}`);
  return res.text();
};

const json = async (url: string): Promise<any> =>
  JSON.parse((await text(url)).replace(/^﻿/, ""));

const local = (date: string, offset: string) =>
  `${date}${offset.startsWith("-") ? "" : "+"}${offset.replace(/:\d\d$/, "")}`;

export async function seasonSessions(year: number): Promise<SessionRef[]> {
  const index = await json(`${BASE}${year}/Index.json`);
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

export async function sessionPath(
  year: number,
  round: number,
  kind: "race" | "sprint",
): Promise<string> {
  const label = kind === "race" ? "Race" : "Sprint";
  const race = (await get(`${year}/${round}.json`)).RaceTable.Races[0];
  const event = kind === "race" ? race : race?.Sprint;
  if (!event) throw new Error(`${label} is not available for this round`);
  const start = Date.parse(`${event.date}T${event.time ?? "00:00:00Z"}`);
  const name = kind === "race" ? /^Race$/ : /^Sprint(?: Race)?$/;
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
  const data = await json(`${BASE}${path}TyreStintSeries.json`);
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

export type Replay = {
  path: string;
  events: Event[];
  duration: number;
  checkpoints: { t: number; index: number; state: State }[];
  session: Session;
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
        rotation: 0,
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
        rotation: c.rotation ?? 0,
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

async function load(path: string): Promise<Replay> {
  const streams = await Promise.all(
    TOPICS.map(async (topic) =>
      parseStream(
        await text(`${BASE}${path}${topic}.jsonStream`).catch(() => ""),
        topic,
      ),
    ),
  );
  const events = streams.flat().sort((a, b) => a.t - b.t);
  const session = new Session();
  const checkpoints: Replay["checkpoints"] = [{ t: 0, index: 0, state: {} }];
  events.forEach((e, index) => {
    if (e.t - checkpoints.at(-1)!.t >= CHECKPOINT_MS)
      checkpoints.push({ t: e.t, index, state: { ...session.state } });
    expand(e).forEach((x) => session.apply(x));
  });
  return {
    path,
    events,
    duration: events.at(-1)?.t ?? 0,
    checkpoints,
    session,
  };
}

const CACHED = 3;
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
