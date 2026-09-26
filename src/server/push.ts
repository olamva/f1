import { createHash, createPrivateKey, createPublicKey } from "node:crypto";
import { DefaultAzureCredential } from "@azure/identity";
import { ContainerClient } from "@azure/storage-blob";
import webpush, { type PushSubscription } from "web-push";

export type Message = { title: string; body: string; tag: string; ttl: number };

const container = process.env.PUSH_STORE
  ? new ContainerClient(
      process.env.PUSH_STORE,
      new DefaultAzureCredential({
        managedIdentityClientId: process.env.AZURE_CLIENT_ID,
      }),
    )
  : null;

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const point = ({ x, y }: JsonWebKey) =>
  Buffer.concat([
    Buffer.from([4]),
    Buffer.from(x!, "base64url"),
    Buffer.from(y!, "base64url"),
  ]).toString("base64url");

export const publicKey =
  container && process.env.VAPID_PUBLIC_KEY
    ? point(
        createPublicKey(process.env.VAPID_PUBLIC_KEY).export({ format: "jwk" }),
      )
    : null;

const blob = (user: string, endpoint: string) =>
  container!.getBlockBlobClient(
    `${hash(user.toLowerCase())}/${hash(endpoint)}.json`,
  );

export const valid = (s: any): s is PushSubscription =>
  typeof s?.endpoint === "string" &&
  s.endpoint.startsWith("https://") &&
  typeof s.keys?.p256dh === "string" &&
  typeof s.keys?.auth === "string";

export const subscribed = (user: string, endpoint: string) =>
  blob(user, endpoint).exists();

export async function subscribe(user: string, s: PushSubscription) {
  const body = JSON.stringify({ endpoint: s.endpoint, keys: s.keys });
  await blob(user, s.endpoint).upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });
}

export const unsubscribe = (user: string, endpoint: string) =>
  blob(user, endpoint).deleteIfExists();

const expired = (e: any) => {
  if (e.statusCode === 404 || e.statusCode === 410) return true;
  console.error("push:", e.statusCode ?? e.message);
  return false;
};

export async function notify(messages: Message[]) {
  if (!container || !process.env.VAPID_PRIVATE_KEY || !messages.length) return;
  const key = createPrivateKey(process.env.VAPID_PRIVATE_KEY).export({
    format: "jwk",
  });
  const vapidDetails = {
    subject: process.env.VAPID_SUBJECT!,
    publicKey: point(key),
    privateKey: key.d!,
  };
  for await (const { name } of container.listBlobsFlat()) {
    const item = container.getBlockBlobClient(name);
    const s = JSON.parse((await item.downloadToBuffer()).toString("utf8"));
    const gone = await messages.reduce<Promise<boolean>>(
      async (done, { ttl, ...data }) =>
        (await done) ||
        webpush
          .sendNotification(s, JSON.stringify(data), { vapidDetails, TTL: ttl })
          .then(() => false, expired),
      Promise.resolve(false),
    );
    if (gone) await item.deleteIfExists();
  }
}
