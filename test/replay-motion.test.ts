import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { replay } from "../src/server/archive.ts";
import { expand, positionEvents } from "../src/server/timing.ts";
import type { Delta } from "../src/shared/timing.ts";
import { applyDelta, positionsAt, type Feed } from "../src/web/live/useFeed.ts";

test("replay position batches preserve the corner between their endpoints", () => {
  const feed: Feed = {
    mode: "replay",
    t: 0,
    beat: 0,
    duration: 3000,
    state: { Position: { "1": [0, 10] } },
  };
  const batch: Delta[] = [
    ["Position", { "1": [10, 10] }, 1000],
    ["Position", { "1": [10, 0] }, 2000],
  ];

  const next = applyDelta(feed, batch);

  assert.deepEqual(next.positionTrail, [
    [1000, { "1": [10, 10] }],
    [2000, { "1": [10, 0] }],
  ]);
  assert.deepEqual(next.state.Position, { "1": [10, 0] });
});

test("a car moves at a constant rate between unevenly spaced samples", () => {
  const trail = applyDelta(
    { mode: "replay", t: 0, beat: 0, duration: 3000, state: {} },
    [
      ["Position", { "1": [0, 0], "2": [5, 5] }, 0],
      ["Position", { "1": [10, 0], "2": [5, 5] }, 500],
      ["Position", { "1": [10, 30], "2": [0, 0] }, 2000],
    ],
  ).positionTrail!;

  assert.deepEqual(positionsAt(trail, 250), { "1": [10, 0], "2": [5, 5] });
  assert.deepEqual(positionsAt(trail, 1000), { "1": [10, 10], "2": [5, 5] });
  assert.deepEqual(positionsAt(trail, 1500), { "1": [10, 20], "2": [5, 5] });
  assert.deepEqual(positionsAt(trail, 9000), { "1": [10, 30] });
});

test("position samples end at the time of their message", () => {
  const events = positionEvents(10_000, {
    Position: [
      { Timestamp: "2026-09-26T11:00:00.000Z", Entries: {} },
      { Timestamp: "2026-09-26T11:00:00.400Z", Entries: {} },
    ],
  });

  assert.deepEqual(
    events.map((e) => e.t),
    [9600, 10_000],
  );
});

test("an archive replay keeps one car position each 500 ms", async (t) => {
  const position = (ms: number) => ({
    Timestamp: `2026-09-26T11:00:0${ms / 1000}Z`,
    Entries: { "1": { X: ms, Y: 0 } },
  });
  const message = deflateRawSync(
    JSON.stringify({ Position: [1000, 1250, 1500, 1750, 2000].map(position) }),
  ).toString("base64");
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string) =>
      new Response(
        url.endsWith("/Position.z.jsonStream")
          ? `\ufeff00:00:02.000${JSON.stringify(message)}\r\n`
          : "",
      ),
  );

  const r = await replay("2026/meeting/positions/");

  assert.deepEqual(
    r.events.flatMap(expand).filter((e) => e.topic === "Position"),
    [1000, 1500, 2000].map((t) => ({
      t,
      topic: "Position",
      data: { "1": [t, 0] },
    })),
  );
});
