import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { deflateRawSync, gzipSync } from "node:zlib";
import { isLive, shared, start } from "../src/server/live.ts";
import type { Delta } from "../src/shared/timing.ts";

const MINUTE = 60_000;
const T0 = Date.parse("2026-10-03T04:10:00Z");
const NOW = Date.parse("2027-03-01T09:00:00Z");

test("a recorded session replays as live at the current time", (t) => {
  const positions = deflateRawSync(
    JSON.stringify({
      Position: [
        {
          Timestamp: new Date(T0 + 25 * MINUTE - 1000).toISOString(),
          Entries: { "1": { X: 1, Y: 2 } },
        },
      ],
    }),
  ).toString("base64");
  const cars = deflateRawSync(
    JSON.stringify({
      Entries: [
        {
          Utc: new Date(T0 + 25 * MINUTE - 1000).toISOString(),
          Cars: {
            "1": {
              Channels: { "0": 11250, "2": 312, "3": 8, "4": 100, "5": 0 },
            },
          },
        },
      ],
    }),
  ).toString("base64");
  const lines = [
    [
      T0,
      "SessionInfo",
      {
        Key: 11729,
        StartDate: "2026-10-03T12:30:00",
        EndDate: "2026-10-03T13:30:00",
        GmtOffset: "08:00:00",
      },
    ],
    [T0, "Heartbeat", { Utc: "2026-10-03T04:10:00.1234567Z" }],
    [T0 + 25 * MINUTE, "Position.z", positions],
    [T0 + 25 * MINUTE, "CarData.z", cars],
    [T0 + 26 * MINUTE, "TimingData", { Lines: { "1": { Position: "1" } } }],
  ];
  const file = join(mkdtempSync(join(tmpdir(), "f1-replay-")), "s.jsonl.gz");
  writeFileSync(file, gzipSync(lines.map((l) => JSON.stringify(l)).join("\n")));
  t.mock.timers.enable({
    apis: ["setTimeout", "setInterval", "Date"],
    now: NOW,
  });
  process.env.LIVE_REPLAY = file;
  process.env.LIVE_REPLAY_FROM = "25";
  const sent = (): Delta[] =>
    JSON.parse(shared.history.after(0, Infinity).json ?? "[]");
  start();
  assert.equal(isLive(), true);
  t.mock.timers.tick(250);
  assert.deepEqual(
    sent().find(([topic]) => topic === "Position"),
    ["Position", { "1": [1, 2] }, NOW - 1000],
  );
  assert.deepEqual(
    sent().find(([topic]) => topic === "CarData"),
    ["CarData", { "1": [312, 8, 100, 0] }, NOW - 1000],
  );
  assert.equal(shared.session.state.TimingData, undefined);
  t.mock.timers.tick(MINUTE);
  assert.deepEqual(
    sent().find(([topic]) => topic === "TimingData"),
    ["TimingData", { Lines: { "1": { Position: "1" } } }, NOW + MINUTE - 1000],
  );
});
