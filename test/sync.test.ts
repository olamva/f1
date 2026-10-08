import assert from "node:assert/strict";
import { test } from "node:test";
import { clockSync, lapSync } from "../src/web/live/sync.ts";

const clock = (Remaining: string, Utc: string) => ({
  Remaining,
  Utc,
  Extrapolating: true,
});

test("a lap sync is the time from the live lap change to the tap", () => {
  assert.equal(lapSync(10_000, 52_400), 42);
  assert.equal(lapSync(10_000, 10_000 + 301_000), null);
  assert.equal(lapSync(10_000, 9_000), null);
  assert.equal(lapSync(null, 9_000), null);
});

test("a clock sync is the live clock seconds past a full minute", () => {
  const c = clock("00:42:00", "2026-01-01T12:00:00Z");
  const tap = Date.parse("2026-01-01T12:00:17Z");
  assert.equal(clockSync(c, tap, 0), 43);
  assert.equal(clockSync(c, tap, 100), 103);
  assert.equal(clockSync(c, tap, 290), 283);
  assert.equal(clockSync({ ...c, Extrapolating: false }, tap, 0), null);
  assert.equal(clockSync(null, tap, 0), null);
});
