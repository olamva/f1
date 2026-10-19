import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { requireGoogle, sessions } from "../src/server/auth.ts";
import * as token from "../src/server/token.ts";

const SECRET = "a-session-secret-of-at-least-32-characters";
Object.assign(process.env, {
  ALLOWED_EMAILS: "ola@example.com",
  OIDC_AUTH_SECRET: SECRET,
  OIDC_CLIENT_ID: "123-abc.apps.googleusercontent.com",
  OIDC_CLIENT_SECRET: "secret",
});

const jwt = (claims: object) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const later = () => Math.floor(Date.now() / 1000) + 3600;
const cookie = async (email: string, secret = SECRET) =>
  `oidc-auth=${await sign({ sub: "1", email, rtk: "", rtkexp: later(), ssnexp: later() }, secret)}`;

const app = new Hono()
  .route("/", sessions)
  .use("/api/token", requireGoogle)
  .get("/api/token", (c) => c.text("ok"))
  .get("/api/live", (c) => c.text("open"));

const request = async (path: string, email?: string, secret?: string) =>
  app.request(`https://f1.example.com${path}`, {
    headers: email ? { cookie: await cookie(email, secret) } : {},
  });

test("only invited Google accounts reach the token routes", async () => {
  const status = async (path: string, email?: string, secret?: string) =>
    (await request(path, email, secret)).status;
  assert.equal(await status("/api/token"), 401);
  assert.equal(await status("/api/token", "someone@example.com"), 403);
  assert.equal(await status("/api/token", "Ola@example.com"), 200);
  assert.equal(
    await status(
      "/api/token",
      "ola@example.com",
      "another-secret-of-at-least-32-chars",
    ),
    401,
  );
  assert.equal(await status("/api/live"), 200);
});

test("an invited Google sign-in outlives the browser session", async () => {
  const res = await request("/api/token", "ola@example.com");
  const [session] = res.headers
    .getSetCookie()
    .filter((c) => c.startsWith("oidc-auth="));
  assert.match(session!, /Max-Age=(3599|3600);/);
});

test("sign-in returns only to a path on this site", async () => {
  const back = async (to: string) =>
    (
      await request(
        `/.auth/login/google?post_login_redirect_uri=${encodeURIComponent(to)}`,
        "ola@example.com",
      )
    ).headers.get("location");
  assert.equal(await back("/settings"), "/settings");
  assert.equal(await back("//evil.example.com"), "/");
  assert.equal(await back("/\\evil.example.com"), "/");
  assert.equal(await back("https://evil.example.com"), "/");
});

test("a saved F1TV token belongs to one user", async () => {
  const value = jwt({ exp: Date.now() / 1000 + 3600 });
  await token.save(token.key("ola@example.com"), value);
  assert.equal(token.current(token.key("OLA@example.com")), value);
  assert.equal(token.current(token.key("friend@example.com")), null);
  assert.equal(token.status(token.key("friend@example.com")).configured, false);
});

test("a signed-out request never starts a transcript", async (t) => {
  process.env.SPEECH_ENDPOINT = "https://speech.example.com";
  process.env.VOICE_ENDPOINT = "https://voice.example.com";
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected fetch");
  });
  const { transcript } = await import("../src/server/radio.ts");
  const url =
    "https://livetiming.formula1.com/static/2026/x/TeamRadio/MAXVER01_1_20260301_120000.mp3";
  assert.equal(await transcript(url, false), null);
  assert.equal(fetch.mock.callCount(), 0);
});

test("a Google sign-in completes and opens the token routes", async (t) => {
  const google = "https://accounts.google.com";
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const sent: { body: URLSearchParams; authorization: string | null }[] = [];
  let nonce = "";
  const json = (value: object) =>
    new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json" },
    });
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url instanceof Request ? url.url : url);
      if (href === `${google}/.well-known/openid-configuration`)
        return json({
          issuer: google,
          authorization_endpoint: `${google}/o/oauth2/v2/auth`,
          token_endpoint: tokenUrl,
          scopes_supported: ["openid", "email"],
        });
      const request = new Request(url, init);
      sent.push({
        body: new URLSearchParams(await request.text()),
        authorization: request.headers.get("authorization"),
      });
      const now = Math.floor(Date.now() / 1000);
      return json({
        access_token: "access",
        token_type: "Bearer",
        expires_in: 3600,
        id_token: `${part({ alg: "RS256" })}.${part({
          iss: google,
          aud: process.env.OIDC_CLIENT_ID,
          sub: "1",
          email: "ola@example.com",
          email_verified: true,
          iat: now,
          exp: now + 3600,
          nonce,
        })}.c2ln`,
      });
    },
  );

  const login = await app.request(
    "https://f1.example.com/.auth/login/google?post_login_redirect_uri=/settings",
  );
  const cookies = login.headers
    .getSetCookie()
    .map((c) => c.split(";")[0]!)
    .join("; ");
  nonce = /nonce=([^;]+)/.exec(cookies)![1]!;
  const state = new URL(login.headers.get("location")!).searchParams.get(
    "state",
  );
  const callback = await app.request(
    `https://f1.example.com/.auth/login/google/callback?code=code&state=${state}`,
    { headers: { cookie: cookies } },
  );
  const session = callback.headers
    .getSetCookie()
    .find((c) => c.startsWith("oidc-auth="))!
    .split(";")[0]!;

  assert.equal(sent[0]!.body.get("client_id"), process.env.OIDC_CLIENT_ID);
  assert.equal(sent[0]!.body.get("client_secret"), "secret");
  assert.equal(sent[0]!.authorization, null);
  assert.equal(
    (
      await app.request("https://f1.example.com/api/token", {
        headers: { cookie: session },
      })
    ).status,
    200,
  );
});
