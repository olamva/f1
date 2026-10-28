import assert from "node:assert/strict";
import { test } from "node:test";
import { raceArchive } from "../src/server/history.ts";

const BASE = "https://api.jolpi.ca/ergast/f1/2026";
const race = (round: string, raceName: string, fp1: string) => ({
  round,
  raceName,
  date: "2026-10-25",
  time: "20:00:00Z",
  Circuit: { Location: { country: "USA" } },
  FirstPractice: { date: "2026-10-23", time: fp1 },
});
const singapore = race("17", "Singapore Grand Prix", "09:30:00Z");
const austin = race("18", "United States Grand Prix", "17:30:00Z");
const page = (Races: unknown[]) => ({
  MRData: { total: String(Races.length), RaceTable: { Races } },
});

const files: Record<string, unknown> = {
  [`${BASE}.json?limit=100`]: page([singapore, austin]),
  [`${BASE}/results.json?limit=100&offset=0`]: page([
    {
      ...singapore,
      Results: [
        {
          number: "16",
          grid: "1",
          position: "1",
          positionText: "1",
          points: "25",
          status: "Finished",
          Driver: {
            driverId: "leclerc",
            givenName: "Charles",
            familyName: "Leclerc",
          },
          Constructor: { constructorId: "ferrari", name: "Ferrari" },
        },
      ],
    },
  ]),
  [`${BASE}/sprint.json?limit=100&offset=0`]: page([]),
};

test("race archive lists a round once its first practice ends, before the round has results", async (t) => {
  let now = Date.parse("2026-10-23T18:00:00Z");
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (callback: () => void) =>
    queueMicrotask(callback),
  );
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  const rounds = async () =>
    (await raceArchive(2026)).races.map((r) => [r.round, r.results.length]);

  assert.deepEqual(await rounds(), [[17, 1]]);
  now = Date.parse("2026-10-23T18:30:00Z");
  assert.deepEqual(await rounds(), [
    [18, 0],
    [17, 1],
  ]);
});
