import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow } from "../src/shared/timing.ts";
import { clockSeconds, lapStarts, lapTime } from "../src/web/live/view.ts";

const lap = (lap: number, t: number): LapRow => ({
  lap,
  t,
  time: "",
  position: "",
  gap: "",
  sectors: [],
  compound: "",
});

const laps = {
  "1": [lap(1, 190), lap(2, 280), lap(3, 370)],
  "4": [lap(1, 200), lap(2, 285), lap(3, 372)],
  "16": [lap(1, 195), lap(2, 290)],
};

test("each lap starts when the leader completes the lap before it", () => {
  assert.deepEqual(lapStarts(laps, 100), [100, 190, 280]);
});

test("a running race also starts the lap after the last completed lap", () => {
  assert.deepEqual(lapStarts(laps, 100, true), [100, 190, 280, 370]);
});

test("a replay without completed laps only has the first lap", () => {
  assert.deepEqual(lapStarts({}, 100), [100]);
});

test("a typed lap outside the race seeks to the nearest lap", () => {
  assert.deepEqual(
    [0, 2, 3, 99].map((n) => lapTime([100, 190, 280], n)),
    [100, 190, 280, 280],
  );
});

test("a typed time reads colon groups from the hours and bare digits from the seconds", () => {
  assert.deepEqual(
    ["1:15", "0:45", "45:00", "1:15:30", "115", "11500", "90"].map(
      clockSeconds,
    ),
    [4500, 2700, 2700, 4530, 75, 4500, 90],
  );
});
