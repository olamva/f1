import * as signalR from "@microsoft/signalr";
import type { Json } from "../shared/merge.ts";
import type { Delta } from "../shared/timing.ts";
import { F1_ORIGIN } from "./origin.ts";
import { play, read, type Line } from "./recording.ts";
import {
  History,
  inflate,
  positionEvents,
  Session,
  TOPICS,
  type Event,
} from "./timing.ts";
import * as token from "./token.ts";

const URL = `${F1_ORIGIN}/signalrcore`;
const FLUSH_MS = 250;
const RETRY_MS = 5_000;
const EDGE_MS = 30 * 60_000;
const FRESH_MS = 2 * 60_000;
const RETAIN_MS = 2 * 60 * 60_000;
const MAX_LAG_MS = 60_000;

type Listener = (reset: boolean) => void;

async function cookie(): Promise<string> {
  const r = await fetch(`${URL}/negotiate`, { method: "OPTIONS" });
  return r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

export class Feed {
  session = new Session();
  history = new History();
  private info: unknown = null;
  private pending: Delta[] = [];
  private lag = 0;
  private connection: signalR.HubConnection | null = null;
  private listeners = new Set<Listener>();
  private key: string | null;

  constructor(key: string | null) {
    this.key = key;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private events(topic: string, data: Json, now: number): Event[] {
    if (topic === "Position.z") {
      const raw = inflate(data as string);
      const stamps = (
        (raw as { Position?: { Timestamp: string }[] }).Position ?? []
      ).map((s) => Date.parse(s.Timestamp));
      const fresh = now - stamps.at(-1)!;
      if (fresh < MAX_LAG_MS) this.lag = fresh;
      return positionEvents(now - this.lag, raw);
    }
    if (topic.endsWith(".z")) return [];
    return [{ t: now - this.lag, topic, data }];
  }

  protected handle(topic: string, data: Json, now = Date.now()) {
    const infoKey =
      topic === "SessionInfo" ? (data as { Key?: unknown }).Key : undefined;
    if (infoKey !== undefined && infoKey !== this.info) {
      this.info = infoKey;
      this.session = new Session();
      this.history = new History();
      this.pending = [];
      this.lag = 0;
      this.listeners.forEach((fn) => fn(true));
    }
    for (const e of this.events(topic, data, now))
      if (this.session.apply(e)) this.pending.push([e.topic, e.data, e.t]);
  }

  private flush() {
    if (!this.pending.length) return;
    const batch = this.pending;
    this.pending = [];
    this.history.add(batch);
    this.listeners.forEach((fn) => fn(false));
  }

  window(from: number) {
    this.flush();
    return this.history.window(from);
  }

  private async connect() {
    const bearer = this.key && token.current(this.key);
    if (this.key && !bearer) return;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(URL, {
        headers: { Cookie: await cookie() },
        ...(bearer ? { accessTokenFactory: () => bearer } : {}),
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    conn.on("feed", (topic: string, data: Json) => this.handle(topic, data));
    conn.onclose(() => {
      if (this.connection === conn) setTimeout(() => this.run(), RETRY_MS);
    });
    await conn.start();
    this.connection = conn;
    const topics = bearer ? TOPICS : TOPICS.filter((t) => !t.endsWith(".z"));
    const state = (await conn.invoke("Subscribe", topics)) as Record<
      string,
      Json
    >;
    if (state.SessionInfo) this.handle("SessionInfo", state.SessionInfo);
    for (const [topic, data] of Object.entries(state)) this.handle(topic, data);
  }

  private run() {
    this.connect().catch((e) => {
      console.error("live timing:", e.message);
      setTimeout(() => this.run(), RETRY_MS);
    });
  }

  async reconnect() {
    const old = this.connection;
    this.connection = null;
    await old?.stop();
    this.run();
  }

  start() {
    this.run();
    setInterval(() => this.flush(), FLUSH_MS);
    return this;
  }

  replay(lines: Line[], from: number) {
    play(lines, from, (topic, data, t) => this.handle(topic, data, t));
    setInterval(() => this.flush(), FLUSH_MS);
    return this;
  }
}

export const shared = new Feed(null);
const feeds = new Map<string, Feed>();

function follow(key: string) {
  const f = feeds.get(key);
  if (f) void f.reconnect();
  else feeds.set(key, new Feed(key).start());
}

export function start() {
  const file = process.env.LIVE_REPLAY;
  if (file)
    return void shared.replay(
      read(file),
      Number(process.env.LIVE_REPLAY_FROM ?? 0) * 60_000,
    );
  if (process.env.NO_LIVE === "1") return;
  shared.start();
  token.keys().forEach(follow);
  token.onChange(follow);
}

export const feed = (key: string | null): Feed =>
  (key && token.current(key) && feeds.get(key)) || shared;

const at = (date: unknown, offset: unknown) =>
  Date.parse(
    `${date}${String(offset ?? "00:00").startsWith("-") ? "" : "+"}${String(offset ?? "00:00").slice(0, 5)}`,
  );

export function isLive(): boolean {
  const { state } = shared.session;
  const info = state.SessionInfo as Record<string, any> | undefined;
  if (!info) return false;
  const status = (state.SessionStatus as { Status?: string } | undefined)
    ?.Status;
  if (status === "Finished" || status === "Finalised" || status === "Ends")
    return false;
  const now = Date.now();
  if (now < at(info.StartDate, info.GmtOffset) - EDGE_MS) return false;
  if (now <= at(info.EndDate, info.GmtOffset) + EDGE_MS) return true;
  const utc = (state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "";
  const beat = Date.parse(utc.endsWith("Z") ? utc : `${utc}Z`);
  return now >= beat && now - beat <= FRESH_MS;
}

export function hasRecentTiming(): boolean {
  const { state } = shared.session;
  const info = state.SessionInfo as Record<string, any> | undefined;
  if (!info) return false;
  const utc = (state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "";
  const beat = Date.parse(utc.endsWith("Z") ? utc : `${utc}Z`);
  const now = Date.now();
  return (
    now >= beat &&
    now - beat <= EDGE_MS &&
    now <= at(info.EndDate, info.GmtOffset) + RETAIN_MS
  );
}
