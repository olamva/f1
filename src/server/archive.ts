import { merge } from "../shared/merge.ts";
import type { Outline, SessionRef } from "../shared/timing.ts";
import { F1_ORIGIN } from "./origin.ts";
import { parseStream, Session, TOPICS, type Event, type State } from "./timing.ts";

const BASE = `${F1_ORIGIN}/static/`;
const CHECKPOINT_MS = 30_000;

const text = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`archive ${res.status} ${url}`);
  return res.text();
};

const json = async (url: string): Promise<any> =>
  JSON.parse((await text(url)).replace(/^﻿/, ""));

const local = (date: string, offset: string) => `${date}${offset.startsWith("-") ? "" : "+"}${offset.slice(0, 5)}`;

export async function seasonSessions(year: number): Promise<SessionRef[]> {
  const index = await json(`${BASE}${year}/Index.json`);
  return index.Meetings.flatMap((m: any) =>
    m.Sessions.filter((s: any) => s.Path || Date.parse(local(s.EndDate, s.GmtOffset)) < Date.now()).map((s: any) => ({
      path: s.Path ?? "",
      meeting: m.Name,
      country: m.Country?.Name ?? "",
      name: s.Name,
      start: local(s.StartDate, s.GmtOffset),
    })),
  );
}

export type Replay = {
  path: string;
  events: Event[];
  duration: number;
  checkpoints: { t: number; index: number; state: State }[];
  session: Session;
};

export async function outlineFor(info: any, fallback: () => Outline | null): Promise<Outline | null> {
  const key = info?.Meeting?.Circuit?.Key;
  const year = Number(String(info?.StartDate ?? "").slice(0, 4));
  if (key && year) {
    const res = await fetch(`https://api.multiviewer.app/api/v1/circuits/${key}/${year}`, {
      headers: { "User-Agent": "f1.ola-vassbotn.no" },
    }).catch(() => null);
    if (res?.ok) {
      const c = await res.json();
      return {
        x: c.x,
        y: c.y,
        rotation: c.rotation ?? 0,
        corners: (c.corners ?? []).map((k: any) => ({ number: k.number, ...k.trackPosition })),
      };
    }
  }
  return fallback();
}

async function load(path: string): Promise<Replay> {
  const streams = await Promise.all(
    TOPICS.map(async (topic) =>
      parseStream(await text(`${BASE}${path}${topic}.jsonStream`).catch(() => ""), topic),
    ),
  );
  const events = streams.flat().sort((a, b) => a.t - b.t);
  const session = new Session();
  const checkpoints: Replay["checkpoints"] = [{ t: 0, index: 0, state: {} }];
  events.forEach((e, index) => {
    if (e.t - checkpoints.at(-1)!.t >= CHECKPOINT_MS)
      checkpoints.push({ t: e.t, index, state: { ...session.state } });
    session.apply(e);
  });
  return { path, events, duration: events.at(-1)?.t ?? 0, checkpoints, session };
}

let current: { path: string; replay: Promise<Replay> } | null = null;

export function replay(path: string): Promise<Replay> {
  if (!/^\d{4}\/[\w\-.]+\/[\w\-.]+\/$/.test(path)) throw new Error("bad path");
  if (current?.path !== path) {
    const r = load(path);
    current = { path, replay: r };
    r.catch(() => {
      if (current?.path === path) current = null;
    });
  }
  return current.replay;
}

export function stateAt(r: Replay, t: number): { state: State; index: number } {
  const cp = r.checkpoints.findLast((c) => c.t <= t) ?? r.checkpoints[0]!;
  const state: State = { ...cp.state };
  let i = cp.index;
  for (; i < r.events.length && r.events[i]!.t <= t; i++) {
    const e = r.events[i]!;
    state[e.topic] = merge(state[e.topic], e.data);
  }
  return { state, index: i };
}
