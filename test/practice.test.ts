import assert from "node:assert/strict";
import { test } from "node:test";
import { practice } from "../src/server/archive.ts";
import { F1_ORIGIN } from "../src/server/origin.ts";

const session = (Name: string, StartDate: string, Path: string) => ({
  Name,
  Type: "Practice",
  StartDate,
  EndDate: StartDate,
  GmtOffset: "04:00:00",
  Path,
});

const files: Record<string, unknown> = {
  "https://api.jolpi.ca/ergast/f1/2024/24.json": {
    MRData: {
      RaceTable: {
        Races: [
          {
            date: "2024-12-08",
            time: "13:00:00Z",
            FirstPractice: { date: "2024-12-06", time: "09:30:00Z" },
            SecondPractice: { date: "2024-12-06", time: "13:00:00Z" },
          },
        ],
      },
    },
  },
  [`${F1_ORIGIN}/static/2024/Index.json`]: {
    Meetings: [
      {
        Name: "Abu Dhabi Grand Prix",
        Sessions: [
          session("Practice 1", "2024-12-06T13:30:00", "2024/abu/fp1/"),
          session("Practice 2", "2024-12-06T17:00:00", "2024/abu/fp2/"),
        ],
      },
    ],
  },
  [`${F1_ORIGIN}/static/2024/abu/fp1/TimingData.json`]: {
    Lines: { "16": { Position: "1", BestLapTime: { Value: "1:25.000" } } },
  },
  [`${F1_ORIGIN}/static/2024/abu/fp1/DriverList.json`]: {},
  [`${F1_ORIGIN}/static/2024/abu/fp2/TimingData.json`]: {
    Lines: {
      "4": { Position: "3", BestLapTime: {}, TimeDiffToFastest: "" },
      "16": {
        Position: "1",
        BestLapTime: { Value: "1:24.321", Lap: 11 },
        TimeDiffToFastest: "",
        NumberOfLaps: 19,
      },
      "39": {
        Position: "2",
        BestLapTime: { Value: "1:26.179", Lap: 18 },
        TimeDiffToFastest: "+1.858",
        NumberOfLaps: 22,
      },
    },
  },
  [`${F1_ORIGIN}/static/2024/abu/fp2/DriverList.json`]: {
    "16": { FirstName: "Charles", LastName: "Leclerc", TeamName: "Ferrari" },
    "39": { FirstName: "Arthur", LastName: "Leclerc", TeamName: "Ferrari" },
  },
};

test("practice reads each car's best lap, gap, laps and driver from the chosen practice session", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  assert.deepEqual(await practice(2024, 24, "fp2"), [
    {
      number: "16",
      position: 1,
      name: "Charles Leclerc",
      team: "Ferrari",
      time: "1:24.321",
      gap: "",
      laps: 19,
    },
    {
      number: "39",
      position: 2,
      name: "Arthur Leclerc",
      team: "Ferrari",
      time: "1:26.179",
      gap: "+1.858",
      laps: 22,
    },
    {
      number: "4",
      position: 3,
      name: "#4",
      team: "",
      time: null,
      gap: "",
      laps: 0,
    },
  ]);
});
