import assert from "node:assert/strict";
import { test } from "node:test";
import { History } from "../src/server/timing.ts";
import { MAX_DELAY_MS, type Delta } from "../src/shared/timing.ts";
import { buffer, type Feed } from "../src/web/live/useFeed.ts";

const at = (t: number): Feed => ({
  mode: "live",
  t,
  beat: t,
  duration: 0,
  state: {},
});

const lap = (n: number, t: number): Delta => ["LapCount", { CurrentLap: n }, t];

test("a delayed client starts at the state from its delay and gets the later updates", (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => now);
  const history = new History();
  now = 180_000;
  history.add([lap(1, 0), lap(2, 90_000), lap(3, now)]);
  assert.deepEqual(history.window(120_000), {
    t: 120_000,
    state: { LapCount: { CurrentLap: 2 } },
    deltas: [lap(3, 180_000)],
  });
});

test("a delay longer than the kept history waits for the oldest kept state", (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => now);
  const history = new History();
  history.add([lap(1, 0)]);
  assert.equal(history.window(-300_000).t, 0);
  now = 60_000;
  history.add([lap(2, now)]);
  now = MAX_DELAY_MS + 60_000;
  history.add([lap(3, now)]);
  assert.deepEqual(history.window(30_000), {
    t: 60_000,
    state: { LapCount: { CurrentLap: 2 } },
    deltas: [lap(3, now)],
  });
});

test("an update that arrives late still shows at its own time", () => {
  const b = buffer();
  b.push(2_000, () => at(2));
  b.push(1_000, () => at(1));
  assert.equal(b.flush(1_500)?.t, 1);
  assert.equal(b.flush(2_500)?.t, 2);
});
