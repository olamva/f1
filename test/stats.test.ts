import assert from "node:assert/strict";
import { test } from "node:test";
import type { Classified, Season } from "../src/shared/season.ts";
import { duels, seasonRecords } from "../src/web/stats/derive.ts";

const result = (
  driver: string,
  position: number,
  points: number,
): Classified => ({
  driver,
  team: "team",
  grid: position,
  position,
  order: position,
  points,
  status: "Finished",
});

const season: Season = {
  year: 2026,
  rounds: [],
  drivers: [
    { id: "a", code: "AAA", name: "Driver A", number: "1", team: "team" },
    { id: "b", code: "BBB", name: "Driver B", number: "2", team: "team" },
  ],
  teams: [{ id: "team", name: "Team" }],
  races: [{ round: 1, results: [result("a", 1, 25), result("b", 2, 18)] }],
  sprints: [{ round: 1, results: [result("b", 1, 8), result("a", 2, 7)] }],
  qualifying: [],
  driverStandings: [],
  constructorStandings: [],
};

test("teammate results keep sprint and race head to head separate", () => {
  const [headToHead] = duels(season);
  assert.deepEqual(headToHead?.race, [1, 0]);
  assert.deepEqual(headToHead?.sprint, [0, 1]);
  assert.deepEqual(headToHead?.racePoints, [25, 18]);
  assert.deepEqual(headToHead?.sprintPoints, [7, 8]);
});

test("sprint records include sprint results without changing race records", () => {
  const records = seasonRecords(season);
  assert.deepEqual(
    records.map(
      ({ wins, sprintStarts, sprintWins, sprintPodiums, sprintPoints }) => ({
        wins,
        sprintStarts,
        sprintWins,
        sprintPodiums,
        sprintPoints,
      }),
    ),
    [
      {
        wins: 1,
        sprintStarts: 1,
        sprintWins: 0,
        sprintPodiums: 1,
        sprintPoints: 7,
      },
      {
        wins: 0,
        sprintStarts: 1,
        sprintWins: 1,
        sprintPodiums: 1,
        sprintPoints: 8,
      },
    ],
  );
  assert.equal(duels({ ...season, races: [] }).length, 1);
});
