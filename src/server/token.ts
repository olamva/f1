import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import type { TokenStatus } from "../shared/token.ts";

const SECRET = "f1tv-token";
const RENEW_URL = "https://api.formula1.com/v1/account/Subscriber/RetrieveSubscriber";
const F1_WEB_API_KEY = "fCUCjWrKPu9ylJwRAv8BpGLEgiAuThx7";
const F1_SYSTEM_ID = "60a9ad84-e93d-480f-80d6-af37494f2e22";
const RENEW_BEFORE_MS = 24 * 60 * 60_000;

const vault = process.env.KEY_VAULT_NAME
  ? new SecretClient(
      `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
      new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID }),
    )
  : null;

let token: string | null = process.env.F1TV_TOKEN ?? null;
const listeners = new Set<() => void>();

export const onChange = (fn: () => void) => listeners.add(fn);

const claims = (jwt: string): Record<string, any> =>
  JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"));

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
  if (typeof t !== "string") throw new Error("No subscriptionToken in that value.");
  return t;
}

async function store(jwt: string) {
  const exp = expiry(jwt);
  if (!exp || exp < Date.now()) throw new Error("That token has expired.");
  await vault?.setSecret(SECRET, jwt);
  token = jwt;
  listeners.forEach((fn) => fn());
}

export const save = (value: string) => store(extract(value));

export const current = (): string | null =>
  token && (expiry(token) ?? 0) > Date.now() ? token : null;

export function status(): TokenStatus {
  const session = token ? claims(token).SessionId : undefined;
  return {
    configured: !!token,
    expiresAt: expiry(token ?? undefined),
    sessionExpiresAt: expiry(session),
  };
}

export async function renew() {
  const s = status();
  if (!token || !s.expiresAt || s.expiresAt - Date.now() > RENEW_BEFORE_MS) return;
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
  if (typeof next === "string" && (expiry(next) ?? 0) > (s.expiresAt ?? 0)) await store(next);
}

export async function start() {
  if (vault) token = (await vault.getSecret(SECRET).catch(() => null))?.value ?? token;
  const tick = () => renew().catch((e) => console.error("f1tv renew:", e.message));
  tick();
  setInterval(tick, 60 * 60_000);
}
