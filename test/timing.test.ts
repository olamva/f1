import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream, Session } from "../src/server/timing.ts";

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
