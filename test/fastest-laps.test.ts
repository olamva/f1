import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { fastestLaps } from "../src/server/archive.ts";
import { F1_ORIGIN } from "../src/server/origin.ts";
import { course, trace } from "../src/web/compare.ts";

const PATH = `${F1_ORIGIN}/static/2026/test/race/`;
const LAP_S = 70;
const RADIUS = (50 * LAP_S * 10) / (2 * Math.PI);

const clock = (s: number) =>
  `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(3).padStart(6, "0")}`;
const utc = (s: number) => new Date(Date.UTC(2026, 0, 1, 12) + s * 1000);
const packed = (data: unknown) =>
  JSON.stringify(deflateRawSync(JSON.stringify(data)).toString("base64"));
const stream = (times: number[], line: (s: number) => string) =>
  times.map((s) => `${clock(s)}${line(s)}`).join("\n");
const ticks = (every: number) =>
  Array.from({ length: 220 / every }, (_, i) => i * every);
const angle = (s: number) => (2 * Math.PI * (s - 10)) / LAP_S;

const timing: [number, unknown][] = [
  [10, { NumberOfLaps: 1 }],
  [
    80,
    {
      NumberOfLaps: 2,
      LastLapTime: { Value: "1:10.000" },
      BestLapTime: { Value: "1:10.000" },
    },
  ],
  [
    150,
    {
      NumberOfLaps: 3,
      LastLapTime: { Value: "1:05.000" },
      BestLapTime: { Value: "1:05.000" },
    },
  ],
  [160, { BestLapTime: { Value: "1:10.000" } }],
];

const files: Record<string, unknown> = {
  "https://api.jolpi.ca/ergast/f1/2026/1.json": {
    MRData: {
      RaceTable: { Races: [{ date: "2026-01-01", time: "12:00:00Z" }] },
    },
  },
  [`${F1_ORIGIN}/static/2026/Index.json`]: {
    Meetings: [
      {
        Name: "Test Grand Prix",
        Sessions: [
          {
            Name: "Race",
            StartDate: "2026-01-01T12:00:00",
            EndDate: "2026-01-01T14:00:00",
            GmtOffset: "00:00:00",
            Path: "2026/test/race/",
          },
        ],
      },
    ],
  },
  [`${PATH}SessionInfo.json`]: {
    ArchiveStatus: { Status: "Complete" },
    Meeting: { Circuit: { Key: 9999 } },
    StartDate: "2026-01-01T12:00:00",
  },
  [`${PATH}DriverList.json`]: {
    "1": { Tla: "VER", FullName: "Max VERSTAPPEN", TeamColour: "3671C6" },
  },
  [`${PATH}TimingData.jsonStream`]: stream(
    timing.map(([s]) => s),
    (s) =>
      JSON.stringify({ Lines: { "1": timing.find(([t]) => t === s)![1] } }),
  ),
  [`${PATH}Position.z.jsonStream`]: stream(ticks(0.5), (s) =>
    packed({
      Position: [
        {
          Timestamp: utc(s).toISOString(),
          Entries: {
            "1": {
              X: RADIUS * Math.cos(angle(s)),
              Y: RADIUS * Math.sin(angle(s)),
            },
          },
        },
      ],
    }),
  ),
  [`${PATH}CarData.z.jsonStream`]: stream(ticks(0.25), (s) =>
    packed({
      Entries: [
        {
          Utc: utc(s).toISOString(),
          Cars: { "1": { Channels: { "2": 180 } } },
        },
      ],
    }),
  ),
};

test("the fastest laps of a session give each driver's official best lap with its telemetry", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    typeof files[url] === "string"
      ? new Response(files[url] as string)
      : files[url]
        ? Response.json(files[url])
        : new Response("", { status: 404 }),
  );

  const { outline, drivers } = await fastestLaps(2026, 1, "race");

  assert.deepEqual(
    drivers.map(({ lap, ...d }) => ({ ...d, lap: lap.lap, time: lap.time })),
    [
      {
        number: "1",
        tla: "VER",
        name: "Max VERSTAPPEN",
        color: "#3671C6",
        lap: 2,
        time: "1:10.000",
      },
    ],
  );
  const lap = trace(course(outline!), drivers[0]!.lap)!;
  assert.ok(lap.speed.every((v) => v === 180));
  assert.ok(Math.abs(lap.time[175]! - LAP_S / 2) < 0.2);
});
