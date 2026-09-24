import assert from "node:assert/strict";
import { test } from "node:test";
import { highlight } from "../src/web/live/view.ts";

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
});
