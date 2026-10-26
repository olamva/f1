import assert from "node:assert/strict";
import { test } from "node:test";
import { clockSync, lapSync, splitSync } from "../src/web/live/sync.ts";

const clock = (Remaining: string, Utc: string) => ({
  Remaining,
  Utc,
  Extrapolating: true,
});

test("a lap sync is the time from the lap change nearest the current offset to the tap", () => {
  const changes = [0, 90_000, 180_000, null];
  assert.equal(lapSync(changes, 1_900_000, 1795), 1810);
  assert.equal(lapSync(changes, 1_900_000, 1735), 1720);
  assert.equal(lapSync([10_000, 52_401], 52_400, 0), 42);
  assert.equal(lapSync([null], 9_000, 0), null);
});

test("a clock sync is the live clock seconds below the full minute on TV", () => {
  const c = clock("00:42:00", "2026-01-01T12:00:00Z");
  const tap = Date.parse("2026-01-01T12:00:17Z");
  assert.equal(clockSync(c, tap, 0), 17);
  assert.equal(clockSync(c, tap, 100), 77);
  assert.equal(clockSync(c, tap, 250), 257);
  assert.equal(clockSync(c, tap, 1800), 1817);
  assert.equal(clockSync({ ...c, Extrapolating: false }, tap, 0), null);
  assert.equal(clockSync(null, tap, 0), null);
});

test("a sync keeps the TV delay when rewound or past the delay limit and rewinds the rest", () => {
  assert.deepEqual(splitSync(42, 0, false), [42, 0]);
  assert.deepEqual(splitSync(1810, 45, true), [45, 1765]);
  assert.deepEqual(splitSync(1810, 45, false), [45, 1765]);
  assert.deepEqual(splitSync(30, 45, true), [30, 0]);
});
