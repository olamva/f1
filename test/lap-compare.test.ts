import assert from "node:assert/strict";
import { test } from "node:test";
import type { LapRow, LapTrace, Outline } from "../src/shared/timing.ts";
import {
  course,
  fastestLap,
  miniSectors,
  STEP,
  trace,
} from "../src/web/compare.ts";

const LENGTH = 5000;
const POINTS = 500;
const FINISH = 0.3;
const radius = (LENGTH * 10) / (2 * POINTS * Math.sin(Math.PI / POINTS));
const spot = (turns: number): [number, number] => [
  radius * Math.cos(2 * Math.PI * turns),
  radius * Math.sin(2 * Math.PI * turns),
];

const outline: Outline = {
  x: Array.from({ length: POINTS }, (_, i) => spot(i / POINTS)[0]),
  y: Array.from({ length: POINTS }, (_, i) => spot(i / POINTS)[1]),
  time: [],
  rotation: 0,
  corners: [],
  sectors: [{ x: spot(FINISH)[0], y: spot(FINISH)[1] }],
  detection: null,
  pit: null,
  marshalSectors: [],
};

const FAST = 50;
const SLOW = 25;

const drive = (slow: boolean, before: number, time: string): LapTrace => {
  const delay = slow ? 200 / SLOW - 200 / FAST : 0;
  const at = (t: number) => {
    const s = (t - before) * FAST;
    if (!slow || s <= 1000) return s;
    const into = t - before - 1000 / FAST;
    return into <= 200 / SLOW ? 1000 + into * SLOW : s - delay * FAST;
  };
  const speed = (t: number) =>
    slow && at(t) > 1000 && at(t) < 1200 ? SLOW * 3.6 : FAST * 3.6;
  const span = before + LENGTH / FAST + delay + 3;
  return {
    lap: 1,
    time,
    car: Array.from({ length: Math.floor(span * 4) + 1 }, (_, i) => [
      i * 250,
      speed(i / 4),
    ]),
    pos: Array.from({ length: Math.floor(span / 0.75) + 1 }, (_, i) => [
      i * 750,
      ...spot(FINISH + at(i * 0.75) / LENGTH),
    ]),
  };
};

test("a lap compare aligns both laps at the finish line and finds the faster car in each mini-sector", () => {
  const track = course(outline);
  const steady = trace(track, drive(false, 3, "1:40.000"))!;
  const slowed = trace(track, drive(true, 1.2, "1:44.000"))!;

  const near = (distance: number) => Math.round(distance / STEP);
  assert.equal(steady.speed[near(1100)], 180);
  assert.equal(slowed.speed[near(1100)], 90);
  assert.equal(slowed.speed[near(950)], 180);
  assert.equal(slowed.speed[near(1250)], 180);
  assert.ok(Math.abs(slowed.time[near(2000)]! - 44) < 0.1);

  const deltas = miniSectors(steady, slowed);
  const decided = deltas.flatMap((d, k) => (Math.abs(d) > 0.2 ? [k] : []));
  assert.deepEqual(decided, [5]);
  assert.ok(Math.abs(deltas[5]! + 4) < 0.2);
});

const row = (lap: number, t: number, time: string): LapRow => ({
  lap,
  t,
  time,
  position: "",
  gap: "",
  sectors: [],
  compound: "",
});

test("the fastest lap skips deleted laps and laps after the shown time", () => {
  const laps = [
    row(1, 100, "1:30.000"),
    row(2, 200, "1:29.000"),
    row(3, 300, "1:29.500"),
    row(4, 400, "1:28.000"),
    row(5, 450, ""),
  ];

  assert.equal(fastestLap(laps, new Set([2]), 350)?.lap, 3);
});
