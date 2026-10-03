import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStream } from "../src/server/timing.ts";
import { merge, type Json } from "../src/shared/merge.ts";
import { highlight, rows } from "../src/web/live/view.ts";

test("race control messages split into toned tokens", () => {
  assert.deepEqual(
    highlight("CAR 1 (VER) TIME 1:23.456 DELETED - TRACK LIMITS AT TURN 4"),
    [
      { text: "CAR " },
      { text: "1 (VER)", tone: "car" },
      { text: " TIME " },
      { text: "1:23.456", tone: "time" },
      { text: " " },
      { text: "DELETED", tone: "bad" },
      { text: " - TRACK LIMITS AT TURN 4" },
    ],
  );
  assert.deepEqual(highlight("PIT EXIT REOPENED AFTER NO FURTHER ACTION"), [
    { text: "PIT EXIT REOPENED AFTER " },
    { text: "NO FURTHER ACTION", tone: "good" },
  ]);
  assert.deepEqual(
    highlight(
      "CAR 23 (ALB) LAP DELETED - DOUBLE YELLOW AT TURN 14 LAP 9 16:16:55 (PIT)",
    ),
    [
      { text: "CAR " },
      { text: "23 (ALB)", tone: "car" },
      { text: " LAP " },
      { text: "DELETED", tone: "bad" },
      { text: " - DOUBLE YELLOW AT TURN 14 LAP 9 16:16:55 (PIT)" },
    ],
  );
});

const cars = Object.fromEntries(
  Array.from({ length: 99 }, (_, i) => [i + 1, {}]),
);

const badges = (RaceControlMessages: Json) =>
  rows({
    RaceControlMessages,
    DriverList: cars,
    TimingData: { Lines: cars },
  }).flatMap((r) => [
    ...(r.investigation ? [`${r.number} yellow: ${r.investigation}`] : []),
    ...(r.penalty ? [`${r.number} red: ${r.penalty}`] : []),
  ]);

const dutch = parseStream(
  readFileSync(
    new URL(
      "fixtures/dutch-2026-race.RaceControlMessages.jsonStream",
      import.meta.url,
    ),
    "utf8",
  ),
  "RaceControlMessages",
);

const until = (text: string) =>
  dutch
    .slice(0, dutch.findIndex((e) => JSON.stringify(e.data).includes(text)) + 1)
    .reduce<Json>((s, e) => merge(s, e.data as Json), {});

test("the 2026 Dutch GP stewards' calls badge each car until a decision or a served penalty", () => {
  assert.deepEqual(badges(until("DRIVE THROUGH PENALTY FOR CAR 43")), [
    "41 red: Drive through penalty: yellow flag infringement",
    "43 red: Drive through penalty: yellow flag infringement",
  ]);
  assert.deepEqual(
    badges(until("CARS 55 (SAI) AND 23 (ALB) UNDER INVESTIGATION")),
    [
      "5 yellow: Will be investigated after the race: leaving pit exit on red light",
      "23 yellow: Under investigation: causing a collision",
      "30 red: 10 s time penalty: yellow flag infringement",
      "43 red: 10 s time penalty: yellow flag infringement",
      "55 yellow: Under investigation: causing a collision",
      "87 yellow: Will be investigated after the race: leaving pit exit on red light",
    ],
  );
  assert.deepEqual(badges(until("10 SECOND TIME PENALTY FOR CAR 55")), [
    "5 yellow: Will be investigated after the race: leaving pit exit on red light",
    "30 red: 10 s time penalty: yellow flag infringement",
    "43 red: 10 s time penalty: yellow flag infringement",
    "55 red: 10 s time penalty: causing a collision",
    "87 yellow: Will be investigated after the race: leaving pit exit on red light",
  ]);
});

test("a black and white flag decides an investigation, and a noted penalty reason adds no badge", () => {
  const messages = [
    "FIA STEWARDS: TURN 4 INCIDENT INVOLVING CARS 30 (LAW) AND 27 (HUL) UNDER INVESTIGATION (15:53:37)",
    "BLACK AND WHITE FLAG FOR CAR 30 (LAW) (15:53:37)",
    "INCIDENT INVOLVING CAR 63 (RUS) NOTED - FAILING TO SERVE TIME PENALTY CORRECTLY",
  ].map((Message) => ({ Message }));
  assert.deepEqual(badges({ Messages: messages.slice(0, 1) }), [
    "27 yellow: Under investigation",
    "30 yellow: Under investigation",
  ]);
  assert.deepEqual(badges({ Messages: messages }), []);
});
