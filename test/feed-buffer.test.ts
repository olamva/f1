import assert from "node:assert/strict";
import { test } from "node:test";
import { buffer, type Feed } from "../src/web/live/useFeed.ts";

const at = (t: number): Feed => ({
  mode: "live",
  t,
  beat: t,
  duration: 0,
  state: {},
});

test("a raised delay rewinds to data that a lower delay already showed", () => {
  const b = buffer();
  for (let s = 0; s <= 100; s++) b.push(s * 1000, () => at(s));
  assert.equal(b.flush(100_000 - 45_000)?.t, 55);
  assert.equal(b.flush(100_000 - 4_000)?.t, 96);
  assert.equal(b.flush(100_000 - 40_000)?.t, 60);
  assert.equal(b.flush(100_000 - 40_000), undefined);
  assert.equal(b.flush(100_000)?.t, 100);
});
