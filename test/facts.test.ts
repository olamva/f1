import assert from "node:assert/strict";
import { test } from "node:test";
import { circuitFacts } from "../src/server/history.ts";

const HAM = { givenName: "Lewis", familyName: "Hamilton" };
const VER = { givenName: "Max", familyName: "Verstappen" };
const LEC = { givenName: "Charles", familyName: "Leclerc" };

const page = (Races: unknown[]) => ({
  MRData: { total: String(Races.length), RaceTable: { Races } },
});
const row = (season: string, Driver: unknown, grid: string) => ({
  season,
  round: "1",
  Results: [{ Driver, grid }],
});
const lap = (season: string, Driver: unknown, time: string) => ({
  season,
  round: "1",
  Results: [{ Driver, FastestLap: { Time: { time } } }],
});

const base = "https://api.jolpi.ca/ergast/f1/circuits/fixture";
const responses: Record<string, unknown> = {
  [`${base}/results/1.json?limit=100&offset=0`]: page([
    row("2019", HAM, "1"),
    row("2020", HAM, "3"),
    row("2021", VER, "1"),
    row("2026", LEC, "15"),
  ]),
  [`${base}/grid/1/results.json?limit=100&offset=0`]: page([
    row("2019", HAM, "1"),
    row("2020", VER, "1"),
    row("2021", VER, "1"),
    row("2026", LEC, "1"),
  ]),
  [`${base}/fastest/1/results.json?limit=100&offset=0`]: page([
    { season: "1958", round: "1", Results: [{ Driver: HAM }] },
    lap("2019", HAM, "1:31.000"),
    lap("2020", VER, "1:30.500"),
    lap("2026", LEC, "1:29.000"),
  ]),
};

test("circuit facts leave out the current season and laps without a time", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    Response.json(responses[url]),
  );
  assert.deepEqual(await circuitFacts("fixture", 2026), [
    { text: "Most wins here: Lewis Hamilton (2)", sessions: ["race"] },
    { text: "Most poles here: Max Verstappen (2)", sessions: ["qualifying"] },
    {
      text: "Pole sitter won 2 of 3 races here",
      sessions: ["qualifying", "race"],
    },
    {
      text: "Furthest back to win here: Lewis Hamilton from P3 (2020)",
      sessions: ["race"],
    },
    {
      text: "Fastest race lap here: 1:30.500 by Max Verstappen (2020)",
      sessions: ["race"],
    },
  ]);
});
