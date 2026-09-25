import assert from "node:assert/strict";
import { test } from "node:test";
import { sprintPace } from "../src/server/pace.ts";

test("sprint pace maps car numbers and leaves out start and pit laps", () => {
  const timing = Array.from({ length: 8 }, (_, index) => {
    const lap = index + 1;
    const time = `1:${String(30 + lap).padStart(2, "0")}.000`;
    return `00:00:${String(lap).padStart(2, "0")}.000${JSON.stringify({ Lines: { "1": { NumberOfLaps: lap, LastLapTime: { Value: time } } } })}`;
  });
  timing.splice(4, 0, '00:00:04.500{"Lines":{"1":{"InPit":true}}}');
  timing.push(
    '00:00:09.000{"Lines":{"2":{"NumberOfLaps":2,"LastLapTime":{"Value":"1:40.000"}}}}',
  );
  assert.deepEqual(
    sprintPace(timing.join("\n"), [{ number: "1", id: "norris" }]),
    {
      norris: [92, 93, 96, 97, 98],
    },
  );
});
