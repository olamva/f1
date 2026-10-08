import assert from "node:assert/strict";
import { test } from "node:test";
import { qualifying } from "../src/server/archive.ts";
import { F1_ORIGIN } from "../src/server/origin.ts";

const session = (Name: string, StartDate: string, Path: string) => ({
  Name,
  Type: Name === "Sprint" ? "Race" : "Qualifying",
  StartDate,
  EndDate: StartDate,
  GmtOffset: "04:00:00",
  Path,
});

const line = (Position: string, ...times: string[]) => ({
  Position,
  BestLapTimes: [0, 1, 2].map((part) =>
    times[part] ? { Value: times[part], Lap: 3 } : {},
  ),
});

const files: Record<string, unknown> = {
  "https://api.jolpi.ca/ergast/f1/2023/4.json": {
    MRData: {
      RaceTable: {
        Races: [
          {
            date: "2023-04-30",
            time: "11:00:00Z",
            Qualifying: { date: "2023-04-28", time: "13:00:00Z" },
            SprintShootout: { date: "2023-04-29", time: "08:30:00Z" },
            Sprint: { date: "2023-04-29", time: "12:30:00Z" },
          },
        ],
      },
    },
  },
  [`${F1_ORIGIN}/static/2023/Index.json`]: {
    Meetings: [
      {
        Name: "Azerbaijan Grand Prix",
        Sessions: [
          session("Qualifying", "2023-04-28T17:00:00", "2023/baku/q/"),
          session("Sprint Shootout", "2023-04-29T12:30:00", "2023/baku/sq/"),
          session("Sprint", "2023-04-29T17:30:00", "2023/baku/sprint/"),
        ],
      },
    ],
  },
  [`${F1_ORIGIN}/static/2023/baku/q/TimingData.json`]: {
    Lines: {
      "16": line("1", "1:42.820", "1:42.500", "1:40.203"),
      "1": line("2", "1:42.400", "1:42.000", "1:40.391"),
    },
  },
  [`${F1_ORIGIN}/static/2023/baku/sq/TimingData.json`]: {
    Lines: {
      "2": line("20", ""),
      "11": line("2", "1:42.900", "1:42.100", "1:41.697"),
      "24": line("16", "1:45.177"),
      "16": line("1", "1:42.820", "1:42.500", "1:41.697"),
    },
  },
};

test("qualifying reads each part's best lap from the qualifying session for the race or the sprint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    files[url] ? Response.json(files[url]) : new Response("", { status: 404 }),
  );
  assert.deepEqual(await qualifying(2023, 4, "race"), [
    { number: "16", position: 1, times: ["1:42.820", "1:42.500", "1:40.203"] },
    { number: "1", position: 2, times: ["1:42.400", "1:42.000", "1:40.391"] },
  ]);
  assert.deepEqual(await qualifying(2023, 4, "sprint"), [
    { number: "16", position: 1, times: ["1:42.820", "1:42.500", "1:41.697"] },
    { number: "11", position: 2, times: ["1:42.900", "1:42.100", "1:41.697"] },
    { number: "24", position: 16, times: ["1:45.177", null, null] },
    { number: "2", position: 20, times: [null, null, null] },
  ]);
});
