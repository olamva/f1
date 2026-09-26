import assert from "node:assert/strict";
import { test } from "node:test";
import { seasonSessions } from "../src/server/archive.ts";

const session = (Name: string, EndDate: string, Path?: string) => ({
  Name,
  StartDate: EndDate,
  EndDate,
  GmtOffset: "04:00:00",
  Path,
});

test("ended sessions without an archive path are listed without a path, future sessions are not", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-09-26T14:00:00Z"),
  });
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      Meetings: [
        {
          Name: "Azerbaijan Grand Prix",
          Sessions: [
            session("Practice 1", "2026-09-25T13:00:00", "2026/fp1/"),
            session("Qualifying", "2026-09-25T17:00:00", "2026/q/"),
            session("Sprint", "2026-09-26T17:30:00"),
            session("Race", "2026-09-26T18:30:00"),
          ],
        },
      ],
    }),
  );
  assert.deepEqual(
    (await seasonSessions(2026)).map((s) => [s.name, s.path]),
    [
      ["FP1", "2026/fp1/"],
      ["Qualifying", "2026/q/"],
      ["Sprint", ""],
    ],
  );
});
