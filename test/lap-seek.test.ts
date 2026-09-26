import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow } from "../src/shared/timing.ts";
import { lapStarts } from "../src/web/live/view.ts";

const lap = (lap: number, t: number): LapRow => ({
  lap,
  t,
  time: "",
  position: "",
  gap: "",
});

test("each lap starts when the leader completes the lap before it", () => {
  const laps = {
    "1": [lap(1, 190), lap(2, 280), lap(3, 370)],
    "4": [lap(1, 200), lap(2, 285), lap(3, 372)],
    "16": [lap(1, 195), lap(2, 290)],
  };
  assert.deepEqual(lapStarts(laps, 100), [100, 190, 280]);
});

test("a replay without completed laps only has the first lap", () => {
  assert.deepEqual(lapStarts({}, 100), [100]);
});
