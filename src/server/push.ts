import { createHash } from "node:crypto";
import webpush, { type PushSubscription } from "web-push";
import { DATA_DIR, list, readJson, remove, writeJson } from "./data.ts";

export type Message = {
  title: string;
  body: string;
  tag: string;
  ttl: number;
  start?: number;
};

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const publicKey = (DATA_DIR && process.env.VAPID_PUBLIC_KEY) || null;

const file = (user: string, endpoint: string) =>
  `push/${hash(user.toLowerCase())}/${hash(endpoint)}.json`;

export const valid = (s: any): s is PushSubscription =>
  typeof s?.endpoint === "string" &&
  s.endpoint.startsWith("https://") &&
  typeof s.keys?.p256dh === "string" &&
  typeof s.keys?.auth === "string";

export const subscribed = async (user: string, endpoint: string) =>
  !!(await readJson(file(user, endpoint)));

export const subscribe = (user: string, s: PushSubscription) =>
  writeJson(file(user, s.endpoint), { endpoint: s.endpoint, keys: s.keys });

export const unsubscribe = (user: string, endpoint: string) =>
  remove(file(user, endpoint));

const expired = (e: any) => {
  if (e.statusCode === 404 || e.statusCode === 410) return true;
  console.error("push:", e.statusCode ?? e.message);
  return false;
};

export async function notify(messages: Message[], owner?: string) {
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY || !messages.length) return;
  const vapidDetails = {
    subject: process.env.VAPID_SUBJECT!,
    publicKey,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
  for (const name of await list(owner ? `push/${owner}` : "push")) {
    const s = await readJson(name);
    const gone = await messages.reduce<Promise<boolean>>(
      async (done, { ttl, ...data }) =>
        (await done) ||
        webpush
          .sendNotification(s, JSON.stringify(data), { vapidDetails, TTL: ttl })
          .then(() => false, expired),
      Promise.resolve(false),
    );
    if (gone) await remove(name);
  }
}
