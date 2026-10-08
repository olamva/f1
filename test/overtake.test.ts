import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream, Session } from "../src/server/timing.ts";

const marks = (before: string[], after: string[] = []) => {
  const session = new Session();
  const say = (Message: string) =>
    session.apply({
      t: 0,
      topic: "RaceControlMessages",
      data: { Messages: [{ Message }] },
    });
  session.apply({
    t: 0,
    topic: "SessionInfo",
    data: {
      Meeting: { Circuit: { Key: 12 } },
      StartDate: "2026-10-04T15:00:00",
    },
  });
  before.forEach(say);
  for (const e of parseStream(
    readFileSync(
      new URL(
        "fixtures/bahrain-2026-race.Position.z.jsonStream",
        import.meta.url,
      ),
      "utf8",
    ),
    "Position.z",
  ))
    session.apply(e);
  after.forEach(say);
  return session.state.OvertakeMode;
};

test("a car within 1 s of the car ahead at the detection point gets Overtake Mode", () => {
  assert.deepEqual(marks(["OVERTAKE ENABLED"]), {
    "41": false,
    "14": true,
    "27": false,
  });
});

test("Overtake Mode shows only while race control enables it", () => {
  const none = { "41": false, "14": false, "27": false };
  assert.deepEqual(marks([]), none);
  assert.deepEqual(marks(["OVERTAKE ENABLED", "OVERTAKE DISABLED"]), none);
  assert.deepEqual(marks(["OVERTAKE ENABLED"], ["SAFETY CAR DEPLOYED"]), none);
  assert.deepEqual(marks(["OVERTAKE ENABLED"], ["VSC DEPLOYED"]), none);
});
