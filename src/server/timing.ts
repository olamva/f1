import { inflateRawSync } from "node:zlib";
import { merge, type Json } from "../shared/merge.ts";
import {
  MAX_DELAY_MS,
  type Delta,
  type LapRow,
  type Outline,
  type Point,
} from "../shared/timing.ts";
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
  "TrackStatus",
  "LapCount",
  "ExtrapolatedClock",
  "TeamRadio",
  "Position.z",
];

const POSITION_SPACING_MS = 500;

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
    };
  }
}

export class History {
  private deltas: Delta[] = [];
  private base: State = {};
  private since = Date.now();

  add(batch: Delta[]) {
    const cut = Date.now() - MAX_DELAY_MS;
    this.deltas.push(...batch);
    while (this.deltas[0] && this.deltas[0][2] <= cut) {
      const [topic, data, t] = this.deltas.shift()!;
      this.base[topic] = merge(this.base[topic], data as Json);
      this.since = Math.max(this.since, t);
    }
  }

  window(from: number): { t: number; state: State; deltas: Delta[] } {
    const t = Math.max(from, this.since);
    const state = { ...this.base };
    const deltas: Delta[] = [];
    for (const d of this.deltas)
      if (d[2] <= t) state[d[0]] = merge(state[d[0]], d[1] as Json);
      else deltas.push(d);
    return { t, state, deltas };
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
