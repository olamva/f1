import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream, Session } from "../src/server/timing.ts";
import { merge, type Json } from "../src/shared/merge.ts";
import { cutGaps, knockout } from "../src/web/live/knockout.ts";
import {
  qualifyingPart,
  relativeTo,
  rows,
  sessionBests,
  type Row,
} from "../src/web/live/view.ts";

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

test("qualifying rows read diffs from the stats of the current part", () => {
  const stats = (q1: string, q2: string) => [
    { TimeDiffToFastest: q1, TimeDifftoPositionAhead: q1 },
    { TimeDiffToFastest: q2, TimeDifftoPositionAhead: q2 },
    { TimeDiffToFastest: "", TimeDifftoPositionAhead: "" },
  ];
  const result = rows({
    DriverList: { "1": {}, "2": {} },
    TimingData: {
      SessionPart: 2,
      Lines: {
        "1": { Position: "1", Stats: stats("+0.516", "") },
        "2": { Position: "2", Stats: stats("", "+0.501") },
      },
    },
  });
  assert.deepEqual(
    result.map(({ gap, interval }) => ({ gap, interval })),
    [
      { gap: "", interval: "" },
      { gap: "+0.501", interval: "+0.501" },
    ],
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

test("qualifying rows measure each best time in the part against the knockout car", () => {
  const line = (position: string, q1: string, q2: string, extra = {}) => ({
    Position: position,
    BestLapTimes: [{ Value: q1 }, { Value: q2 }, {}],
    ...extra,
  });
  const state = {
    SessionInfo: { Type: "Qualifying", Name: "Qualifying" },
    DriverList: { "1": {}, "2": {}, "3": {}, "4": {} },
    TimingData: {
      SessionPart: 2,
      NoEntries: { "0": 4, "1": 3, "2": 2 },
      Lines: {
        "1": line("1", "1:30.000", "1:29.500"),
        "2": line("2", "1:31.000", "1:30.250"),
        "3": line("3", "1:30.500", "1:30.400"),
        "4": line("4", "1:31.500", "", { KnockedOut: true }),
      },
    },
  };
  assert.equal(knockout(state), 2);
  assert.deepEqual(
    cutGaps(rows(state), state).map(({ gap }) => gap),
    ["-0.750", "", "+0.150", ""],
  );
  assert.deepEqual(
    relativeTo(cutGaps(rows(state), state), "3")
      .slice(0, 3)
      .map(({ gap }) => gap),
    ["-0.900", "-0.150", ""],
  );
  assert.equal(
    knockout({ ...state, TimingData: { ...state.TimingData, SessionPart: 3 } }),
    null,
  );
});

test("a car that stops on track shows as out, like a retired car", () => {
  const status = (line: Json) =>
    rows({ TimingData: { Lines: { "1": line } }, DriverList: { "1": {} } })[0]!
      .status;
  assert.equal(status({ Stopped: true }), "OUT");
  assert.equal(status({ Retired: true, InPit: true }), "OUT");
});

test("relativeTo measures gap and interval toward the selected driver", () => {
  const line = (number: string, gap: string, interval: string) =>
    ({ number, gap, interval, lapsBehind: gap === "1L" ? 1 : null }) as Row;
  const tower = [
    line("1", "LAP 30", "LAP 30"),
    line("2", "+1.500", "+1.500"),
    line("3", "+4.000", "+2.500"),
    line("4", "1L", "1L"),
  ];
  assert.deepEqual(
    relativeTo(tower, "2").map(({ gap, interval }) => [gap, interval]),
    [
      ["-1.500", "-1.500"],
      ["", ""],
      ["+2.500", "+2.500"],
      ["+1 LAP", "1L"],
    ],
  );
  assert.equal(relativeTo(tower, undefined), tower);
});

test("the fallback outline traces the fastest timed lap, not an in-lap", () => {
  const session = new Session();
  const laps: [number, number, string][] = [
    [0, 1, ""],
    [100_000, 2, "1:40.000"],
    [400_000, 3, ""],
    [490_000, 4, "1:30.000"],
    [600_000, 5, "1:50.000"],
  ];
  [
    ...laps.map(([t, lap, time]) => ({
      t,
      topic: "TimingData",
      data: {
        Lines: {
          "1": {
            NumberOfLaps: lap,
            ...(time && { LastLapTime: { Value: time } }),
          },
        },
      },
    })),
    ...Array.from({ length: 601 }, (_, s) => ({
      t: s * 1000,
      topic: "Position",
      data: { "1": [s, 0] },
    })),
  ]
    .sort((a, b) => a.t - b.t)
    .forEach((e) => session.apply(e));
  const { x } = session.outline()!;
  assert.deepEqual([x[0], x.at(-1)], [400, 490]);
});

test("the tower shows the stationary time of the last pit stop from the stream", () => {
  const stream = [
    '01:09:34.998{"PitTimes":{"1":[{"PitStop":{"PitStopTime":"4.1","Lap":"7"}}]}}',
    '01:48:12.307{"PitTimes":{"1":{"1":{"PitStop":{"PitStopTime":"2.5","Lap":"32"}}}}}',
  ].join("\n");
  const PitStopSeries = parseStream(stream, "PitStopSeries").reduce<Json>(
    (s, e) => merge(s, e.data),
    {},
  );
  const [row] = rows({
    PitStopSeries,
    DriverList: { "1": {} },
    TimingData: { Lines: { "1": { Position: "1" } } },
  });
  assert.equal(row!.pitTime, "2.5");
});

test("track status changes become safety car, VSC and red flag periods", () => {
  const session = new Session();
  for (const [t, Status] of [
    [10, "2"],
    [20, "4"],
    [25, "4"],
    [30, "1"],
    [40, "6"],
    [45, "7"],
    [50, "5"],
    [60, "4"],
  ] as const)
    session.apply({ t, topic: "TrackStatus", data: { Status } });
  assert.deepEqual(session.periods, [
    { kind: "sc", from: 20, to: 30 },
    { kind: "vsc", from: 40, to: 50 },
    { kind: "red", from: 50, to: 60 },
    { kind: "sc", from: 60, to: null },
  ]);
});
