import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow } from "../src/shared/timing.ts";
import { longRuns } from "../src/web/live/longRuns.ts";

const lap = (n: number, time: string, extra: Partial<LapRow> = {}): LapRow => ({
  lap: n,
  t: n,
  time,
  position: "",
  gap: "",
  sectors: [],
  compound: "MEDIUM",
  ...extra,
});

const run = (from: number, count: number, time = "1:30.000") =>
  Array.from({ length: count }, (_, i) => lap(from + i, time));

test("a stint of 5 laps is a long run and a shorter one is not", () => {
  const out = longRuns({ "1": run(1, 5), "2": run(1, 4) }, 1000);
  assert.deepEqual(out, [
    { number: "1", compound: "MEDIUM", laps: 5, mean: 90 },
  ]);
});

test("out laps, in laps and slow laps are excluded from the mean", () => {
  const laps = [
    lap(1, "2:00.000", { pit: "out" }),
    ...run(2, 5),
    lap(7, "1:40.000"),
    lap(8, "2:00.000", { pit: "in" }),
  ];
  const [only] = longRuns({ "1": laps }, 1000);
  assert.equal(only?.laps, 5);
  assert.equal(only?.mean, 90);
});

test("stints sort by mean lap time", () => {
  const out = longRuns(
    { "1": run(1, 5, "1:31.000"), "2": run(1, 5, "1:30.000") },
    1000,
  );
  assert.deepEqual(
    out.map((r) => r.number),
    ["2", "1"],
  );
});
