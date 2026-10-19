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
  OIDC_CLIENT_ID: "client",
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
