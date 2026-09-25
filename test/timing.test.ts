import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream, Session } from "../src/server/timing.ts";
import { merge, type Json } from "../src/shared/merge.ts";
import { rows } from "../src/web/live/view.ts";

const fixture = (name: string) =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

test("the 2026 Spanish GP stream gives car 1 a row for each of its 57 laps", () => {
  const session = new Session();
  for (const e of parseStream(fixture("spain-2026-race-car1.TimingData.jsonStream"), "TimingData"))
    session.apply(e);
  const rows = session.laps["1"]!;
  assert.equal(rows.length, 57);
  assert.deepEqual(
    rows.slice(1, 3).map(({ lap, time, position }) => ({ lap, time, position })),
    [
      { lap: 2, time: "1:39.404", position: "1" },
      { lap: 3, time: "1:40.111", position: "1" },
    ],
  );
  assert.equal(rows.at(-1)!.time, "1:37.018");
  assert.equal(rows.filter((r) => !r.time).length, 1);
});

test("a compressed position frame expands into one sample for each timestamp", () => {
  const events = parseStream(fixture("spain-2026-race.Position.z.jsonStream"), "Position.z");
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => e.topic === "Position"));
  assert.deepEqual((events[0]!.data as Record<string, number[]>)["1"], [6933, -980]);
  assert.ok(events.every((e, i) => i === 0 || e.t >= events[i - 1]!.t));
});

test("mid-lap mini-sectors show each segment colour and leave unreached segments empty", () => {
  const events = parseStream(fixture("spain-2026-race-car1.TimingData.jsonStream"), "TimingData");
  const TimingData = events.slice(0, 151).reduce<Json>((s, e) => merge(s, e.data as Json), {});
  const [row] = rows({ TimingData, DriverList: { "1": {} } });
  assert.deepEqual(
    row!.sectors.map((s) => s.segments),
    [
      ["normal", "personal", "personal", "personal", "personal", "personal", "personal", "personal"],
      ["personal", "personal", "overall", "personal", "personal", "overall", "overall", "overall"],
      ["overall", ...Array(9).fill("none")],
    ],
  );
});

test("timing rows count lapped cars without reading the leader lap counter as a gap", () => {
  const result = rows({
    DriverList: { "1": {}, "2": {}, "3": {} },
    TimingData: { Lines: {
      "1": { Position: "1", GapToLeader: "LAP 12" },
      "2": { Position: "2", GapToLeader: "1 LAP" },
      "3": { Position: "3", GapToLeader: "+2 LAPS" },
    } },
  });
  assert.deepEqual(result.map(({ lapsBehind }) => lapsBehind), [null, 1, 2]);
});
