import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream, Session } from "../src/server/timing.ts";
import { merge, type Json } from "../src/shared/merge.ts";
import { qualifyingPart, rows, sessionBests } from "../src/web/live/view.ts";

const fixture = (name: string) =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

test("the 2026 Spanish GP stream gives car 1 a row for each of its 57 laps", () => {
  const session = new Session();
  for (const e of parseStream(
    fixture("spain-2026-race-car1.TimingData.jsonStream"),
    "TimingData",
  ))
    session.apply(e);
  const rows = session.laps["1"]!;
  assert.equal(rows.length, 57);
  assert.deepEqual(
    rows
      .slice(1, 3)
      .map(({ lap, time, position }) => ({ lap, time, position })),
    [
      { lap: 2, time: "1:39.404", position: "1" },
      { lap: 3, time: "1:40.111", position: "1" },
    ],
  );
  assert.equal(rows.at(-1)!.time, "1:37.018");
  assert.equal(rows.filter((r) => !r.time).length, 1);
});

test("a compressed position frame expands into one sample for each timestamp", () => {
  const events = parseStream(
    fixture("spain-2026-race.Position.z.jsonStream"),
    "Position.z",
  );
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => e.topic === "Position"));
  assert.deepEqual(
    (events[0]!.data as Record<string, number[]>)["1"],
    [6933, -980],
  );
  assert.ok(events.every((e, i) => i === 0 || e.t >= events[i - 1]!.t));
});

test("mid-lap mini-sectors show each segment colour and leave unreached segments empty", () => {
  const events = parseStream(
    fixture("spain-2026-race-car1.TimingData.jsonStream"),
    "TimingData",
  );
  const TimingData = events
    .slice(0, 151)
    .reduce<Json>((s, e) => merge(s, e.data as Json), {});
  const [row] = rows({ TimingData, DriverList: { "1": {} } });
  assert.deepEqual(
    row!.sectors.map((s) => s.segments),
    [
      [
        "normal",
        "personal",
        "personal",
        "personal",
        "personal",
        "personal",
        "personal",
        "personal",
      ],
      [
        "personal",
        "personal",
        "overall",
        "personal",
        "personal",
        "overall",
        "overall",
        "overall",
      ],
      ["overall", ...Array(9).fill("none")],
    ],
  );
});

test("timing rows count lapped cars without reading the leader lap counter as a gap", () => {
  const result = rows({
    DriverList: { "1": {}, "2": {}, "3": {} },
    TimingData: {
      Lines: {
        "1": { Position: "1", GapToLeader: "LAP 12" },
        "2": { Position: "2", GapToLeader: "1 LAP" },
        "3": { Position: "3", GapToLeader: "+2 LAPS" },
      },
    },
  });
  assert.deepEqual(
    result.map(({ lapsBehind }) => lapsBehind),
    [null, 1, 2],
  );
});

test("race rows count the places each car gained or lost from its grid slot", () => {
  const result = rows({
    DriverList: { "1": {}, "2": {}, "3": {} },
    TimingData: {
      Lines: {
        "1": { Position: "1" },
        "2": { Position: "2" },
        "3": { Position: "3" },
      },
    },
    TimingAppData: {
      Lines: { "1": { GridPos: "4" }, "2": { GridPos: "1" }, "3": {} },
    },
  });
  assert.deepEqual(
    result.map(({ gained }) => gained),
    [3, -1, null],
  );
});

test("session best owners use personal records instead of the latest sectors", () => {
  const state = {
    DriverList: {
      "1": { Tla: "VER", TeamColour: "3671C6" },
      "2": { Tla: "RUS", TeamColour: "27F4D2" },
      "3": { Tla: "HAM", TeamColour: "E8002D" },
    },
    TimingData: {
      Lines: {
        "1": {
          Position: "1",
          BestLapTime: { Value: "1:44.500" },
          Sectors: [{ Value: "40.000" }],
        },
        "2": {
          Position: "2",
          BestLapTime: { Value: "1:44.000" },
          Sectors: [{ Value: "34.000" }],
        },
        "3": {
          Position: "3",
          BestLapTime: { Value: "1:45.000" },
          Sectors: [{ Value: "36.000" }],
        },
      },
    },
    TimingStats: {
      Lines: {
        "1": {
          BestSectors: [
            { Value: "35.000" },
            { Value: "42.000" },
            { Value: "25.000" },
          ],
          PersonalBestLapTime: { Value: "1:44.500" },
        },
        "2": {
          BestSectors: [
            { Value: "36.000" },
            { Value: "41.000" },
            { Value: "26.000" },
          ],
          PersonalBestLapTime: { Value: "1:44.000" },
        },
        "3": {
          BestSectors: [
            { Value: "37.000" },
            { Value: "43.000" },
            { Value: "24.000" },
          ],
          PersonalBestLapTime: { Value: "1:45.000" },
        },
      },
    },
  };
  assert.deepEqual(sessionBests(state, rows(state)), {
    sectors: [
      { number: "1", tla: "VER", color: "#3671C6", value: "35.000" },
      { number: "2", tla: "RUS", color: "#27F4D2", value: "41.000" },
      { number: "3", tla: "HAM", color: "#E8002D", value: "24.000" },
    ],
    lap: { number: "2", tla: "RUS", color: "#27F4D2", value: "1:44.000" },
  });
});

test("qualifyingPart names the qualifying segment", () => {
  assert.equal(
    qualifyingPart({
      SessionInfo: { Type: "Qualifying", Name: "Qualifying" },
      TimingData: { SessionPart: 2 },
    }),
    "Q2",
  );
  assert.equal(
    qualifyingPart({
      SessionInfo: { Type: "Qualifying", Name: "Sprint Qualifying" },
      TimingData: { SessionPart: 3 },
    }),
    "SQ3",
  );
  assert.equal(
    qualifyingPart({
      SessionInfo: { Type: "Race", Name: "Race" },
      TimingData: {},
    }),
    null,
  );
});
