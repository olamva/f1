import assert from "node:assert/strict";
import { test } from "node:test";
import { trackStatus } from "../src/web/live/view.ts";

test("green track status shows no flag banner", () => {
  assert.equal(trackStatus({ TrackStatus: { Status: "1", Message: "AllClear" } }), null);
  assert.equal(trackStatus({}), null);
});

test("yellow and red flags use different tones", () => {
  const yellow = trackStatus({ TrackStatus: { Status: "2", Message: "Yellow" } });
  const red = trackStatus({ TrackStatus: { Status: "5", Message: "Red" } });
  assert.ok(yellow && red);
  assert.notEqual(yellow.tone, red.tone);
});
