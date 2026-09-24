import assert from "node:assert/strict";
import { test } from "node:test";
import type { Delta } from "../src/shared/timing.ts";
import { applyDelta, type Feed } from "../src/web/live/useFeed.ts";

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

  assert.deepEqual(next.positionTrail, {
    from: { "1": [0, 10] },
    samples: [{ "1": [10, 10] }, { "1": [10, 0] }],
  });
  assert.deepEqual(next.state.Position, { "1": [10, 0] });
});
