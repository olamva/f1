import { inflateRawSync } from "node:zlib";
import { merge, type Json } from "../shared/merge.ts";
import type { Delta, LapRow, Outline, Point } from "../shared/timing.ts";
import type { Message } from "./push.ts";
import { seconds } from "./season.ts";

export type Event = { t: number; topic: string; data: Json };
export type State = Record<string, Json>;

export const TOPICS = [
  "Heartbeat",
  "SessionInfo",
  "SessionStatus",
  "DriverList",
  "TimingData",
  "TimingAppData",
  "TimingStats",
  "RaceControlMessages",
  "WeatherData",
  "WeatherDataSeries",
  "TrackStatus",
  "LapCount",
  "ExtrapolatedClock",
  "TeamRadio",
  "PitStopSeries",
  "Position.z",
];

const POSITION_SPACING_MS = 500;
const CHECKPOINT_MS = 2 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

export const at = (date: unknown, offset: unknown) =>
  Date.parse(
    `${date}${String(offset ?? "00:00")
      .replace(/^(?!-)/, "+")
      .slice(0, 6)}`,
  );

export const inflate = (b64: string): Json =>
  JSON.parse(inflateRawSync(Buffer.from(b64, "base64")).toString("utf8"));

type Sample = {
  Timestamp: string;
  Entries: Record<string, { X: number; Y: number }>;
};

export function positionEvents(t: number, raw: Json): Event[] {
  const samples = (raw as { Position?: Sample[] }).Position ?? [];
  const last = Date.parse(samples.at(-1)?.Timestamp ?? "");
  return samples.map((s) => ({
    t: t + (Date.parse(s.Timestamp) - last || 0),
    topic: "Position",
    data: Object.fromEntries(
      Object.entries(s.Entries).map(([n, e]) => [n, [e.X, e.Y]]),
    ),
  }));
}

export class Session {
  state: State = {};
  laps: Record<string, LapRow[]> = {};
  track: Record<string, Point[]> = {};
  private lastPosition = -Infinity;

  apply(e: Event): Event | null {
    if (e.topic === "Position") {
      if (e.t - this.lastPosition < POSITION_SPACING_MS) return null;
      this.lastPosition = e.t;
      for (const [n, p] of Object.entries(
        e.data as Record<string, [number, number]>,
      ))
        (this.track[n] ??= []).push([e.t, p[0], p[1]]);
    }
    this.state[e.topic] = merge(this.state[e.topic], e.data);
    if (e.topic === "TimingData") this.trackLaps(e);
    return e;
  }

  private trackLaps(e: Event) {
    const lines = (e.data as { Lines?: Record<string, any> }).Lines ?? {};
    const all = ((this.state.TimingData as any)?.Lines ?? {}) as Record<
      string,
      any
    >;
    for (const [n, delta] of Object.entries(lines)) {
      const line = all[n];
      const lap = Number(line?.NumberOfLaps);
      if (!lap) continue;
      const rows = (this.laps[n] ??= []);
      let row = rows.at(-1);
      if (row?.lap !== lap) {
        row = { lap, t: e.t, time: "", position: line.Position ?? "", gap: "" };
        rows.push(row);
      }
      if (delta.NumberOfLaps !== undefined) {
        row.t = e.t;
        row.position = line.Position ?? row.position;
        row.gap = line.GapToLeader ?? line.TimeDiffToFastest ?? "";
      }
      if (delta.LastLapTime?.Value) row.time = delta.LastLapTime.Value;
    }
  }

  outline(): Outline | null {
    const best = Object.entries(this.laps)
      .filter(([n]) => this.track[n]?.length)
      .flatMap(([n, rows]) =>
        rows.flatMap((row, i) =>
          row.time && row.lap === rows[i - 1]?.lap + 1
            ? [{ n, from: rows[i - 1]!.t, to: row.t, time: seconds(row.time) }]
            : [],
        ),
      )
      .sort((a, b) => a.time - b.time)[0];
    if (!best) return null;
    const { n, from, to } = best;
    const points = this.track[n]!.filter(([t]) => t >= from && t <= to);
    if (points.length < 20) return null;
    return {
      x: points.map((p) => p[1]),
      y: points.map((p) => p[2]),
      time: points.map((p) => p[0]),
      rotation: 0,
      corners: [],
      sectors: [],
      marshalSectors: [],
    };
  }
}

export function delays(session: Session, data: Json): Message[] {
  const info = session.state.SessionInfo as Record<string, any> | undefined;
  const status = (
    session.state.SessionStatus as { Status?: string } | undefined
  )?.Status;
  if (
    !info ||
    (status && status !== "Inactive") ||
    Object.keys(session.laps).length
  )
    return [];
  const scheduled = at(info.StartDate, info.GmtOffset);
  const messages =
    (data as { Messages?: Record<string, { Utc?: string; Message?: string }> })
      .Messages ?? {};
  return Object.values(messages).flatMap(({ Utc, Message: text = "" }) => {
    const clock = /(?:START AT|DELAYED TO) (\d{1,2}):(\d{2})/.exec(text);
    const by = /DELAYED BY (\d+) MINUTES/.exec(text);
    const local = clock
      ? at(
          `${String(info.StartDate).slice(0, 11)}${clock[1]!.padStart(2, "0")}:${clock[2]}:00`,
          info.GmtOffset,
        )
      : scheduled + Number(by?.[1]) * 60_000;
    const start = local < scheduled - DAY_MS / 2 ? local + DAY_MS : local;
    if (
      /\bS?Q[23]\b/.test(text) ||
      !(start > scheduled || /DELAY|SUSPENDED/.test(text))
    )
      return [];
    return [
      {
        title: `${info.Meeting?.Name} · ${info.Name}`,
        body: "Start delayed.",
        tag: `delay-${info.Key}-${Utc}`,
        ttl: 30 * 60,
        ...(start > scheduled && { start }),
      },
    ];
  });
}

export class History {
  since = Date.now();
  start?: number;
  private deltas: [t: number, json: string][] = [];
  private checkpoints: { i: number; t: number; state: string }[] = [];
  private state: State = {};
  private latest = -Infinity;

  add(batch: Delta[]) {
    for (const d of batch) {
      if (d[0] === "SessionStatus" && (d[1] as any)?.Status === "Started")
        this.start ??= Math.max(d[2], this.since);
      this.deltas.push([d[2], JSON.stringify(d)]);
      this.state[d[0]] = merge(this.state[d[0]], d[1] as Json);
      this.latest = Math.max(this.latest, d[2]);
    }
    if (
      this.latest - (this.checkpoints.at(-1)?.t ?? this.since) >=
      CHECKPOINT_MS
    )
      this.checkpoints.push({
        i: this.deltas.length,
        t: this.latest,
        state: JSON.stringify(this.state),
      });
  }

  window(from: number): { t: number; state: State; next: number } {
    const t = Math.max(from, this.since);
    const cp = this.checkpoints.findLast((c) => c.t <= t);
    const state: State = cp ? JSON.parse(cp.state) : {};
    let i = cp?.i ?? 0;
    for (; i < this.deltas.length && this.deltas[i]![0] <= t; i++) {
      const [topic, data] = JSON.parse(this.deltas[i]![1]) as Delta;
      state[topic] = merge(state[topic], data as Json);
    }
    return { t, state, next: i };
  }

  after(next: number, until: number): { next: number; json: string | null } {
    let i = next;
    while (i < this.deltas.length && this.deltas[i]![0] <= until) i++;
    const json = this.deltas
      .slice(next, i)
      .map((d) => d[1])
      .join(",");
    return { next: i, json: json ? `[${json}]` : null };
  }
}

export function parseStream(text: string, topic: string): Event[] {
  const out: Event[] = [];
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const m = /^(\d+):(\d+):(\d+\.\d+)(.+)$/.exec(line);
    if (!m) continue;
    const t = (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000;
    const raw = JSON.parse(m[4]!) as Json;
    if (topic.endsWith(".z"))
      out.push(...positionEvents(t, inflate(raw as string)));
    else out.push({ t, topic, data: raw });
  }
  return out;
}
