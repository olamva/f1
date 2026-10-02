import assert from "node:assert/strict";
import { test } from "node:test";
import { History } from "../src/server/timing.ts";
import type { Delta } from "../src/shared/timing.ts";
import { buffer, type Feed } from "../src/web/live/useFeed.ts";

const at = (t: number): Feed => ({
  mode: "live",
  t,
  beat: t,
  duration: 0,
  state: {},
});

const lap = (n: number, t: number): Delta => ["LapCount", { CurrentLap: n }, t];

test("a delayed client starts at the state from its delay and gets each later update when it is due", (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => now);
  const history = new History();
  for (const [n, time] of [
    [1, 0],
    [2, 130_000],
    [3, 200_000],
    [4, 300_000],
  ] as const) {
    now = time;
    history.add([lap(n, time)]);
  }
  const { state, next } = history.window(250_000);
  assert.deepEqual(state, { LapCount: { CurrentLap: 3 } });
  assert.deepEqual(history.after(next, 299_999), { next, json: null });
  assert.deepEqual(JSON.parse(history.after(next, 300_000).json!), [
    lap(4, 300_000),
  ]);
});

test("a delay longer than the kept history waits for the oldest kept state", (t) => {
  t.mock.method(Date, "now", () => 60_000);
  const history = new History();
  history.add([lap(1, 60_000)]);
  assert.equal(history.window(30_000).t, 60_000);
});

test("an update that arrives late still shows at its own time", () => {
  const b = buffer();
  b.push(2_000, () => at(2));
  b.push(1_000, () => at(1));
  assert.equal(b.flush(1_500)?.t, 1);
  assert.equal(b.flush(2_500)?.t, 2);
});
