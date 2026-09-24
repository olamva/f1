import assert from "node:assert/strict";
import { test } from "node:test";
import { isLive, session } from "../src/server/live.ts";

test("a red-flagged session stays live past its scheduled end while the feed is fresh", (t) => {
  const now = Date.parse("2026-09-24T15:00:00Z");
  t.mock.method(Date, "now", () => now);
  session.state = {
    SessionInfo: {
      StartDate: "2026-09-24T12:00:00",
      EndDate: "2026-09-24T13:00:00",
      GmtOffset: "00:00",
    },
    SessionStatus: { Status: "Aborted" },
    TrackStatus: { Status: "5" },
    Heartbeat: { Utc: "2026-09-24T14:59:30Z" },
  };
  assert.equal(isLive(), true);
  session.state.Heartbeat = { Utc: "2026-09-24T14:55:00Z" };
  assert.equal(isLive(), false);
  session.state.SessionStatus = { Status: "Finalised" };
  session.state.Heartbeat = { Utc: "2026-09-24T14:59:30Z" };
  assert.equal(isLive(), false);
  session.state = {};
});
