import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { requireGoogle } from "../src/server/auth.ts";
import * as token from "../src/server/token.ts";

const principal = (email: string) =>
  Buffer.from(
    JSON.stringify({
      auth_typ: "google",
      claims: [
        {
          typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
          val: email,
        },
      ],
    }),
  ).toString("base64");

const jwt = (claims: object) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

test("only invited Google accounts reach the token routes", async () => {
  process.env.ALLOWED_EMAILS = "ola@example.com";
  const app = new Hono()
    .use("/api/token", requireGoogle)
    .get("/api/token", (c) => c.text("ok"))
    .get("/api/live", (c) => c.text("open"));
  const status = async (path: string, email?: string) =>
    (
      await app.request(path, {
        headers: email ? { "x-ms-client-principal": principal(email) } : {},
      })
    ).status;
  assert.equal(await status("/api/token"), 401);
  assert.equal(await status("/api/token", "someone@example.com"), 403);
  assert.equal(await status("/api/token", "Ola@example.com"), 200);
  assert.equal(await status("/api/live"), 200);
});

test("a saved F1TV token belongs to one user", async () => {
  const value = jwt({ exp: Date.now() / 1000 + 3600 });
  await token.save(token.key("ola@example.com"), value);
  assert.equal(token.current(token.key("OLA@example.com")), value);
  assert.equal(token.current(token.key("friend@example.com")), null);
  assert.equal(token.status(token.key("friend@example.com")).configured, false);
});
