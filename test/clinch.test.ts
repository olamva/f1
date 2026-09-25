import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clinchMatrix,
  constructorNeeds,
  earliestClinch,
  hasClinched,
  isEliminated,
  simulate,
  type Standing,
  type Upcoming,
} from "../src/shared/clinch.ts";

const s = (id: string, points: number, wins: number): Standing => ({
  id,
  points,
  countback: [wins],
});

const race = (round: number, name: string): Upcoming => ({
  round,
  name,
  kind: "race",
});
const sprint = (round: number, name: string): Upcoming => ({
  round,
  name,
  kind: "sprint",
});

const beforeAbuDhabi2025 = [
  s("norris", 408, 7),
  s("max_verstappen", 396, 7),
  s("piastri", 392, 7),
  s("russell", 309, 2),
];
const abuDhabi = [race(24, "Abu Dhabi")];

test("2025 finale: Norris had not clinched, Russell was out", () => {
  assert.equal(
    hasClinched(beforeAbuDhabi2025, abuDhabi, "norris", "drivers"),
    false,
  );
  assert.equal(
    isEliminated(beforeAbuDhabi2025, abuDhabi, "russell", "drivers"),
    true,
  );
  assert.equal(
    isEliminated(beforeAbuDhabi2025, abuDhabi, "piastri", "drivers"),
    false,
  );
});

test("2025 finale matrix: P3 behind a Verstappen win was enough, P4 was not", () => {
  const m = clinchMatrix(
    beforeAbuDhabi2025,
    abuDhabi,
    "norris",
    "max_verstappen",
  );
  const at = (mine: number | null, theirs: number) =>
    m.cells[m.mine.indexOf(mine)]![m.theirs.indexOf(theirs)];
  assert.equal(at(3, 1), true);
  assert.equal(at(4, 1), false);
  assert.equal(at(4, 2), true);
  assert.equal(at(null, 11), false);
  assert.equal(at(2, 2), null);
});

test("2025 finale simulated with the real result crowns Norris", () => {
  const picks = [
    { max_verstappen: [1], piastri: [2], norris: [3], russell: [5] },
  ];
  const r = simulate(beforeAbuDhabi2025, abuDhabi, picks, "drivers");
  assert.deepEqual(r.decided, { index: 0, id: "norris" });
  assert.equal(r.final[0]!.points, 423);
});

test("2025 Qatar weekend: Norris could clinch at the Qatar race at the earliest", () => {
  const table = [
    s("norris", 390, 7),
    s("piastri", 366, 7),
    s("max_verstappen", 366, 6),
    s("russell", 294, 2),
  ];
  const events = [
    sprint(23, "Qatar sprint"),
    race(23, "Qatar"),
    race(24, "Abu Dhabi"),
  ];
  assert.deepEqual(earliestClinch(table, events, "norris", "drivers"), {
    state: "possible",
    index: 1,
  });
});

const afterBaku2025 = [
  s("mclaren", 623, 12),
  s("mercedes", 290, 1),
  s("ferrari", 286, 0),
  s("red_bull", 272, 4),
];
const restOf2025 = [
  race(18, "Singapore"),
  sprint(19, "US sprint"),
  race(19, "US"),
  race(20, "Mexico"),
  sprint(21, "Brazil sprint"),
  race(21, "Brazil"),
  race(22, "Las Vegas"),
  sprint(23, "Qatar sprint"),
  race(23, "Qatar"),
  race(24, "Abu Dhabi"),
];

test("2025 constructors: McLaren clinched at Singapore with the real result", () => {
  assert.deepEqual(
    earliestClinch(afterBaku2025, restOf2025, "mclaren", "constructors"),
    {
      state: "possible",
      index: 0,
    },
  );
  const picks = [
    { mercedes: [1, 5], red_bull: [2], mclaren: [3, 4], ferrari: [6, 8] },
  ];
  const r = simulate(afterBaku2025, restOf2025, picks, "constructors");
  assert.deepEqual(r.decided, { index: 0, id: "mclaren" });
  assert.equal(r.final[0]!.points, 650);
});

test("2025 constructors: McLaren's real 27 points met the need against Mercedes' 35", () => {
  const needs = constructorNeeds(
    afterBaku2025,
    restOf2025,
    "mclaren",
    "mercedes",
  );
  const need = needs.find((n) => n.rival === 35)!.need;
  assert.ok(need !== null && need <= 27);
});
