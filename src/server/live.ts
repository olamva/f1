import * as signalR from "@microsoft/signalr";
import type { Json } from "../shared/merge.ts";
import type { Delta } from "../shared/timing.ts";
import { F1_ORIGIN } from "./origin.ts";
import { inflate, positionEvents, Session, TOPICS, type Event } from "./timing.ts";
import * as token from "./token.ts";

const URL = `${F1_ORIGIN}/signalrcore`;
const FLUSH_MS = 250;
const RETRY_MS = 5_000;
const EDGE_MS = 30 * 60_000;
const FRESH_MS = 2 * 60_000;

export let session = new Session();
let key: unknown = null;
let pending: Delta[] = [];
let connection: signalR.HubConnection | null = null;
const listeners = new Set<(batch: Delta[] | "reset") => void>();

export const subscribe = (fn: (batch: Delta[] | "reset") => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function events(topic: string, data: Json, t: number): Event[] {
  if (topic === "Position.z") return positionEvents(t, inflate(data as string));
  if (topic.endsWith(".z")) return [];
  return [{ t, topic, data }];
}

function handle(topic: string, data: Json) {
  const infoKey = topic === "SessionInfo" ? (data as { Key?: unknown }).Key : undefined;
  if (infoKey !== undefined && infoKey !== key) {
    key = infoKey;
    session = new Session();
    pending = [];
    listeners.forEach((fn) => fn("reset"));
  }
  for (const e of events(topic, data, Date.now()))
    if (session.apply(e)) pending.push([e.topic, e.data, e.t]);
}

async function cookie(): Promise<string> {
  const r = await fetch(`${URL}/negotiate`, { method: "OPTIONS" });
  return r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function connect() {
  const bearer = token.current();
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(URL, {
      headers: { Cookie: await cookie() },
      ...(bearer ? { accessTokenFactory: () => bearer } : {}),
    })
    .configureLogging(signalR.LogLevel.Warning)
    .build();
  conn.on("feed", (topic: string, data: Json) => handle(topic, data));
  conn.onclose(() => {
    if (connection === conn) setTimeout(run, RETRY_MS);
  });
  await conn.start();
  connection = conn;
  const state = (await conn.invoke("Subscribe", TOPICS)) as Record<string, Json>;
  if (state.SessionInfo) handle("SessionInfo", state.SessionInfo);
  for (const [topic, data] of Object.entries(state)) handle(topic, data);
}

function run() {
  connect().catch((e) => {
    console.error("live timing:", e.message);
    setTimeout(run, RETRY_MS);
  });
}

async function reconnect() {
  const old = connection;
  connection = null;
  await old?.stop();
  run();
}

export function start() {
  token.onChange(() => void reconnect());
  run();
  setInterval(() => {
    if (!pending.length) return;
    const batch = pending;
    pending = [];
    listeners.forEach((fn) => fn(batch));
  }, FLUSH_MS);
}

const at = (date: unknown, offset: unknown) =>
  Date.parse(`${date}${String(offset ?? "00:00").startsWith("-") ? "" : "+"}${String(offset ?? "00:00").slice(0, 5)}`);

export function isLive(): boolean {
  const info = session.state.SessionInfo as Record<string, any> | undefined;
  if (!info) return false;
  const status = (session.state.SessionStatus as { Status?: string } | undefined)?.Status;
  if (status === "Finished" || status === "Finalised" || status === "Ends") return false;
  const now = Date.now();
  if (now < at(info.StartDate, info.GmtOffset) - EDGE_MS) return false;
  if (now <= at(info.EndDate, info.GmtOffset) + EDGE_MS) return true;
  const utc = (session.state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "";
  const beat = Date.parse(utc.endsWith("Z") ? utc : `${utc}Z`);
  return now >= beat && now - beat <= FRESH_MS;
}

export function hasRecentTiming(): boolean {
  if (!session.state.SessionInfo) return false;
  const utc = (session.state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "";
  const beat = Date.parse(utc.endsWith("Z") ? utc : `${utc}Z`);
  const now = Date.now();
  return now >= beat && now - beat <= EDGE_MS;
}

export const hasPositions = () => !!token.current();
