import assert from "node:assert/strict";
import { test } from "node:test";
import { trackStatus } from "../src/web/live/view.ts";

test("green track status shows no flag banner", () => {
  assert.equal(
    trackStatus({ TrackStatus: { Status: "1", Message: "AllClear" } }),
    null,
  );
  assert.equal(trackStatus({}), null);
});

test("yellow and red flags use different tones", () => {
  const yellow = trackStatus({
    TrackStatus: { Status: "2", Message: "Yellow" },
  });
  const red = trackStatus({ TrackStatus: { Status: "5", Message: "Red" } });
  assert.ok(yellow && red);
  assert.notEqual(yellow.tone, red.tone);
});

test("safety car banner ends after the in this lap message", () => {
  const state = {
    TrackStatus: { Status: "4" },
    RaceControlMessages: {
      Messages: [
        { Message: "SAFETY CAR DEPLOYED" },
        { Message: "SAFETY CAR IN THIS LAP" },
      ],
    },
  };
  assert.equal(trackStatus(state)?.label, "Safety Car ending");
  state.RaceControlMessages.Messages.push({ Message: "SAFETY CAR DEPLOYED" });
  assert.equal(trackStatus(state)?.label, "Safety Car");
  state.TrackStatus.Status = "1";
  assert.equal(trackStatus(state), null);
});
