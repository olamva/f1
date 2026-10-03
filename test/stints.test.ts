import assert from "node:assert/strict";
import { test } from "node:test";
import { stints } from "../src/server/archive.ts";
import { F1_ORIGIN } from "../src/server/origin.ts";

const stint = (
  Compound: string,
  New: string,
  StartLaps: number,
  TotalLaps: number,
) => ({ Compound, New, TyresNotChanged: "0", StartLaps, TotalLaps });

const files: Record<string, unknown> = {
  "https://api.jolpi.ca/ergast/f1/2023/18.json": {
    MRData: {
      RaceTable: {
        Races: [
          {
            date: "2023-10-08",
            time: "17:00:00Z",
            Sprint: { date: "2023-10-07", time: "17:30:00Z" },
          },
        ],
      },
    },
  },
  [`${F1_ORIGIN}/static/2023/Index.json`]: {
    Meetings: [
      {
        Name: "Qatar Grand Prix",
        Sessions: [
          {
            Type: "Race",
            StartDate: "2023-10-07T20:30:00",
            EndDate: "2023-10-07T21:30:00",
            GmtOffset: "03:00:00",
          },
          {
            Name: "Sprint",
            StartDate: "2023-10-07T20:30:00",
            EndDate: "2023-10-07T21:30:00",
            GmtOffset: "03:00:00",
            Path: "2023/qatar/sprint/",
          },
          {
            Name: "Race",
            StartDate: "2023-10-08T20:00:00",
            EndDate: "2023-10-08T22:00:00",
            GmtOffset: "03:00:00",
            Path: "2023/qatar/race/",
          },
        ],
      },
    ],
  },
  [`${F1_ORIGIN}/static/2023/qatar/sprint/TyreStintSeries.json`]: {
    Stints: { "87": [stint("SOFT", "true", 0, 19)] },
  },
  [`${F1_ORIGIN}/static/2023/qatar/race/TyreStintSeries.json`]: {
    Stints: {
      "87": [
        stint("MEDIUM", "true", 0, 7),
        stint("HARD", "true", 0, 8),
        stint("HARD", "false", 8, 9),
        stint("SOFT", "true", 0, 0),
      ],
    },
  },
};

test("tyre stints come from the race session and count laps on each set from its fitting", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  assert.deepEqual(await stints(2023, 18, "race"), {
    "87": [
      { compound: "MEDIUM", new: true, from: 1, to: 7 },
      { compound: "HARD", new: true, from: 8, to: 15 },
      { compound: "HARD", new: false, from: 16, to: 16 },
    ],
  });
});
