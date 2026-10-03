import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream, Session } from "../src/server/timing.ts";
import { merge, type Json } from "../src/shared/merge.ts";
import type { LapRow } from "../src/shared/timing.ts";
import {
  deletedLaps,
  theoreticalBest,
  type Row,
} from "../src/web/live/view.ts";

test("a practice in-lap gets its own row and keeps the timed lap before it", () => {
  const session = new Session();
  const timing = (t: number, line: Json) =>
    session.apply({ t, topic: "TimingData", data: { Lines: { "41": line } } });
  session.apply({
    t: 0,
    topic: "TimingAppData",
    data: { Lines: { "41": { Stints: [{ Compound: "SOFT" }] } } },
  });
  timing(1, { NumberOfLaps: 1, InPit: false, PitOut: true });
  timing(2, { PitOut: false });
  timing(3, { NumberOfLaps: 2, Sectors: [{ Value: "59.069" }] });
  timing(4, {
    NumberOfLaps: 3,
    Sectors: [{ Value: "26.325" }, { Value: "35.815" }, { Value: "42.413" }],
    LastLapTime: { Value: "1:44.553" },
  });
  timing(5, { InPit: true });
  timing(6, {
    Sectors: { "0": { Value: "26.749" }, "2": { Value: "48.703" } },
    LastLapTime: { Value: "1:51.448" },
  });
  timing(7, { InPit: false, PitOut: true, NumberOfLaps: 4 });
  timing(8, { PitOut: false });
  timing(9, { NumberOfLaps: 5, LastLapTime: { Value: "2:17.082" } });
  assert.deepEqual(
    session.laps["41"]!.map(({ lap, time, sectors, compound, pit }) => ({
      lap,
      time,
      sectors,
      compound,
      pit,
    })),
    [
      { lap: 1, time: "", sectors: [], compound: "SOFT", pit: "in" },
      { lap: 2, time: "", sectors: ["59.069"], compound: "SOFT", pit: "out" },
      {
        lap: 3,
        time: "1:44.553",
        sectors: ["26.325", "35.815", "42.413"],
        compound: "SOFT",
        pit: undefined,
      },
      {
        lap: 4,
        time: "1:51.448",
        sectors: ["26.749", "35.815", "48.703"],
        compound: "SOFT",
        pit: "in",
      },
      {
        lap: 5,
        time: "2:17.082",
        sectors: ["26.749", "35.815", "48.703"],
        compound: "SOFT",
        pit: "out",
      },
    ],
  );
});

test("race control deletes the laps of one car in both message formats", () => {
  const RaceControlMessages = parseStream(
    readFileSync(
      new URL(
        "fixtures/dutch-2026-race.RaceControlMessages.jsonStream",
        import.meta.url,
      ),
      "utf8",
    ),
    "RaceControlMessages",
  ).reduce<Json>((s, e) => merge(s, e.data as Json), {});
  const state = { RaceControlMessages };
  assert.deepEqual([...deletedLaps(state, "27")], [5, 40]);
  assert.deepEqual([...deletedLaps(state, "23")], [49, 65]);
  assert.deepEqual([...deletedLaps(state, undefined)], []);
});

test("the theoretical best skips deleted laps and ranks against other best laps", () => {
  const lap = (n: number, sectors: string[]): LapRow => ({
    lap: n,
    t: n,
    time: "",
    position: "",
    gap: "",
    sectors,
    compound: "",
  });
  const laps = [
    lap(1, ["30.000", "40.000", "20.000"]),
    lap(2, ["29.000", "39.500", "20.500"]),
    lap(3, ["28.000", "38.000", "19.000"]),
  ];
  const rows = [
    { number: "1", bestLap: "1:28.000" },
    { number: "4", bestLap: "1:29.000" },
    { number: "16", bestLap: "1:30.000" },
  ] as Row[];
  assert.deepEqual(theoreticalBest("4", laps, new Set([3]), rows), {
    seconds: 88.5,
    position: 2,
  });
  assert.equal(theoreticalBest("4", [], new Set(), rows), null);
});
