import assert from "node:assert/strict";
import { test } from "node:test";
import { sectorFlags, trackStatus } from "../src/web/live/view.ts";

test("green track status shows no flag banner", () => {
  assert.equal(
    trackStatus({ TrackStatus: { Status: "1", Message: "AllClear" } }),
    null,
  );
  assert.equal(trackStatus({}), null);
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
  assert.equal(trackStatus(state)?.label, "Safety Car Ending");
  state.RaceControlMessages.Messages.push({ Message: "SAFETY CAR DEPLOYED" });
  assert.equal(trackStatus(state)?.label, "Safety Car");
  state.TrackStatus.Status = "1";
  assert.equal(trackStatus(state), null);
});

test("sector yellows last until the sector or the whole track clears", () => {
  const flag = (Flag: string, Scope: string, Sector?: number) => ({
    Category: "Flag",
    Flag,
    Scope,
    Sector,
  });
  const state = {
    RaceControlMessages: {
      Messages: [
        flag("YELLOW", "Sector", 6),
        flag("DOUBLE YELLOW", "Sector", 7),
        flag("YELLOW", "Sector", 9),
        flag("BLUE", "Driver"),
        flag("CLEAR", "Sector", 6),
      ],
    },
  };
  assert.deepEqual(
    [...sectorFlags(state)],
    [
      [7, "DOUBLE YELLOW"],
      [9, "YELLOW"],
    ],
  );
  state.RaceControlMessages.Messages.push(flag("CLEAR", "Track"));
  assert.deepEqual([...sectorFlags(state)], []);
});
