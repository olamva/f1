import assert from "node:assert/strict";
import { test } from "node:test";
import { delays, Session } from "../src/server/timing.ts";
import type { Json } from "../src/shared/merge.ts";

const session = (info: Json, status = "Inactive") => {
  const s = new Session();
  s.state = { SessionInfo: info, SessionStatus: { Status: status } };
  return s;
};
const message = (Utc: string, Message: string) => ({
  Messages: { "7": { Utc, Message } },
});

test("race control delays before the start push the new start time and no race control text", () => {
  const spa = session({
    Key: 9135,
    Name: "Qualifying",
    Meeting: { Name: "Belgian Grand Prix" },
    StartDate: "2023-07-28T17:00:00",
    GmtOffset: "02:00:00",
  });
  assert.deepEqual(
    delays(
      spa,
      message(
        "2023-07-28T14:51:32",
        "START OF QUALIFYING WILL BE DELAYED BY 10 MINUTES",
      ),
    ),
    [
      {
        title: "Belgian Grand Prix · Qualifying",
        body: "Start delayed.",
        tag: "delay-9135-2023-07-28T14:51:32",
        ttl: 1800,
        start: Date.parse("2023-07-28T15:10:00Z"),
      },
    ],
  );
  assert.deepEqual(
    delays(spa, message("2023-07-28T15:07:45", "Q1 WILL START AT 17:10")).map(
      (m) => m.start,
    ),
    [Date.parse("2023-07-28T15:10:00Z")],
  );
  assert.deepEqual(
    delays(
      spa,
      message("2023-07-28T14:55:00", "START OF QUALIFYING WILL BE DELAYED"),
    ).map((m) => [m.body, m.start]),
    [["Start delayed.", undefined]],
  );
  assert.deepEqual(
    delays(spa, message("2023-07-28T15:06:00", "LOW GRIP CONDITIONS")),
    [],
  );
});

test("a delayed start in the Americas past midnight gets the next day", () => {
  const vegas = (StartDate: string) =>
    session({ Key: 9183, StartDate, GmtOffset: "-08:00:00" });
  assert.deepEqual(
    delays(
      vegas("2023-11-17T02:00:00"),
      message("2023-11-17T09:58:00", "FREE PRACTICE 2 WILL START AT 2:30"),
    ).map((m) => m.start),
    [Date.parse("2023-11-17T10:30:00Z")],
  );
  assert.deepEqual(
    delays(
      vegas("2023-11-16T23:30:00"),
      message("2023-11-17T07:58:00", "FREE PRACTICE 2 WILL START AT 0:15"),
    ).map((m) => m.start),
    [Date.parse("2023-11-17T08:15:00Z")],
  );
});

test("no delay push after the session has started, even between qualifying parts", () => {
  const info = {
    Key: 9114,
    StartDate: "2023-06-30T17:00:00",
    GmtOffset: "02:00:00",
  };
  const delayed = message(
    "2023-06-30T16:22:20",
    "START OF SESSION DELAYED TO 18:45",
  );
  assert.equal(delays(session(info), delayed).length, 1);
  assert.deepEqual(delays(session(info, "Started"), delayed), []);
  const paused = session(info);
  paused.laps = { "1": [{ lap: 3, t: 0, time: "", position: "1", gap: "" }] };
  assert.deepEqual(delays(paused, delayed), []);
  assert.deepEqual(
    delays(
      session(info),
      message("2023-06-30T15:25:45", "Q2 WILL START AT 17:31"),
    ),
    [],
  );
});
