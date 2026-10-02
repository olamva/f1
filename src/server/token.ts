import { createHash } from "node:crypto";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import type { TokenStatus } from "../shared/token.ts";

const PREFIX = "f1tv-user-";
const RENEW_URL =
  "https://api.formula1.com/v1/account/Subscriber/RetrieveSubscriber";
const F1_WEB_API_KEY = "fCUCjWrKPu9ylJwRAv8BpGLEgiAuThx7";
const F1_SYSTEM_ID = "60a9ad84-e93d-480f-80d6-af37494f2e22";
const RENEW_BEFORE_MS = 24 * 60 * 60_000;

const vault = process.env.KEY_VAULT_NAME
  ? new SecretClient(
      `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
      new DefaultAzureCredential({
        managedIdentityClientId: process.env.AZURE_CLIENT_ID,
      }),
    )
  : null;

const tokens = new Map<string, string>();
const listeners = new Set<(key: string) => void>();

export const onChange = (fn: (key: string) => void) => listeners.add(fn);

export const key = (user: string) =>
  PREFIX + createHash("sha256").update(user.toLowerCase()).digest("hex");

export const keys = () => [...tokens.keys()];

const claims = (jwt: string): Record<string, any> =>
  JSON.parse(
    Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"),
  );

const expiry = (jwt: string | undefined): number | null => {
  try {
    return jwt ? claims(jwt).exp * 1000 : null;
  } catch {
    return null;
  }
};

export function extract(value: string): string {
  const v = value.trim().replace(/^login-session=/, "");
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(v)) return v;
  const t = JSON.parse(decodeURIComponent(v))?.data?.subscriptionToken;
  if (typeof t !== "string")
    throw new Error("No subscriptionToken in that value.");
  return t;
}

async function store(key: string, jwt: string) {
  const exp = expiry(jwt);
  if (!exp || exp < Date.now()) throw new Error("That token has expired.");
  await vault?.setSecret(key, jwt);
  tokens.set(key, jwt);
  listeners.forEach((fn) => fn(key));
}

export const save = (key: string, value: string) => store(key, extract(value));

export function current(key: string): string | null {
  const token = tokens.get(key);
  return token && (expiry(token) ?? 0) > Date.now() ? token : null;
}

export function status(key: string): TokenStatus {
  const token = tokens.get(key);
  const session = token ? claims(token).SessionId : undefined;
  return {
    configured: !!token,
    expiresAt: expiry(token ?? undefined),
    sessionExpiresAt: expiry(session),
  };
}

async function renew(key: string) {
  const token = tokens.get(key);
  const s = status(key);
  if (!token || !s.expiresAt || s.expiresAt - Date.now() > RENEW_BEFORE_MS)
    return;
  if (!s.sessionExpiresAt || s.sessionExpiresAt < Date.now()) return;
  const res = await fetch(RENEW_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      apikey: F1_WEB_API_KEY,
      "CD-SystemId": F1_SYSTEM_ID,
      "cd-sessionid": claims(token).SessionId,
      orderSubmitted: "true",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`renew ${res.status}`);
  const next = (await res.json())?.data?.subscriptionToken;
  if (typeof next === "string" && (expiry(next) ?? 0) > (s.expiresAt ?? 0))
    await store(key, next);
}

export async function load() {
  if (vault)
    for await (const p of vault.listPropertiesOfSecrets()) {
      if (!p.enabled || !p.name.startsWith(PREFIX)) continue;
      const value = (await vault.getSecret(p.name).catch(() => null))?.value;
      if (value) tokens.set(p.name, value);
    }
}

export async function start() {
  await load();
  const tick = () =>
    keys().forEach((key) =>
      renew(key).catch((e) => console.error("f1tv renew:", e.message)),
    );
  tick();
  setInterval(tick, 60 * 60_000);
}
