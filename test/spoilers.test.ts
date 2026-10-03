import assert from "node:assert/strict";
import { test } from "node:test";
import type { Round } from "../src/shared/season.ts";
import { fresh, onLiveTab } from "../src/web/spoilers.ts";

const round = (n: number, sessions: Partial<Round["sessions"]>): Round => ({
  round: n,
  name: `Round ${n}`,
  circuit: "",
  circuitId: "",
  country: "",
  sessions: {
    fp1: null,
    fp2: null,
    fp3: null,
    sprintQualifying: null,
    sprint: null,
    qualifying: null,
    race: null,
    ...sessions,
  },
});

const rounds = [
  round(1, {
    fp1: "2026-03-06T10:00:00Z",
    qualifying: "2026-03-07T14:00:00Z",
    race: "2026-03-08T14:00:00Z",
  }),
  round(2, {
    fp1: "2026-03-13T10:00:00Z",
    sprintQualifying: "2026-03-13T14:00:00Z",
    sprint: "2026-03-14T10:00:00Z",
    qualifying: "2026-03-14T14:00:00Z",
    race: "2026-03-15T14:00:00Z",
  }),
];

const at = (iso: string) => Date.parse(iso);

test("spoiler mode covers the started sessions of the latest round", () => {
  for (const [now, ids] of [
    ["2026-03-14T11:00:00Z", ["2026/2/sprintQualifying", "2026/2/sprint"]],
    ["2026-03-13T12:00:00Z", ["2026/1/qualifying", "2026/1/race"]],
    ["2026-03-01T00:00:00Z", []],
  ] as const)
    assert.deepEqual(
      fresh(rounds, at(now)).map((s) => s.id),
      ids,
      now,
    );
});

test("the live tab shows the live session, or else the next session", () => {
  for (const [now, live, id] of [
    ["2026-03-14T10:30:00Z", true, "2026/2/sprint"],
    ["2026-03-14T13:40:00Z", true, "2026/2/qualifying"],
    ["2026-03-14T11:30:00Z", false, "2026/2/qualifying"],
  ] as const)
    assert.equal(onLiveTab(rounds, at(now), live)?.id, id, now);
});
