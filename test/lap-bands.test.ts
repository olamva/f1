import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow, Period } from "../src/shared/timing.ts";
import { bandsOf } from "../src/web/live/bands.ts";

const lap = (n: number, t: number): LapRow => ({
  lap: n,
  t,
  time: "",
  position: "",
  gap: "",
  sectors: [],
  compound: "",
});

const laps = [lap(1, 0), lap(2, 100), lap(3, 200), lap(4, 300)];

test("a safety car period maps to fractional lap numbers", () => {
  const periods: Period[] = [{ kind: "sc", from: 150, to: 250 }];
  const [band] = bandsOf(periods, laps, 1000);
  assert.equal(band?.from, 2.5);
  assert.equal(band?.to, 3.5);
  assert.equal(band?.label, "SC");
});

test("red flags are not shaded and an open period ends at the feed time", () => {
  const periods: Period[] = [
    { kind: "red", from: 0, to: 50 },
    { kind: "vsc", from: 100, to: null },
  ];
  const bands = bandsOf(periods, laps, 250);
  assert.equal(bands.length, 1);
  assert.equal(bands[0]?.label, "VSC");
  assert.equal(bands[0]?.to, 3.5);
});

test("periods after the feed time are dropped", () => {
  assert.deepEqual(
    bandsOf([{ kind: "sc", from: 500, to: 600 }], laps, 400),
    [],
  );
});
