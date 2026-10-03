import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { replay, stateAt } from "../src/server/archive.ts";

const frame = (utc: string, channels: Record<string, number>) =>
  JSON.stringify(
    deflateRawSync(
      JSON.stringify({
        Entries: [{ Utc: utc, Cars: { "1": { Channels: channels } } }],
      }),
    ).toString("base64"),
  );

test("an archive replay shows the car telemetry at the seek time", async (t) => {
  const stream = [
    `00:00:01.000${frame("2026-09-26T11:00:01Z", { "0": 11000, "2": 300, "3": 7, "4": 100, "5": 0 })}`,
    `00:00:02.000${frame("2026-09-26T11:00:02Z", { "0": 9000, "2": 120, "3": 3, "4": 0, "5": 104 })}`,
  ].join("\n");
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string) =>
      new Response(url.endsWith("/CarData.z.jsonStream") ? stream : ""),
  );
  const r = await replay("2026/meeting/race/");
  assert.deepEqual(stateAt(r, 1500).state.CarData, { "1": [300, 7, 100, 0] });
  assert.deepEqual(stateAt(r, 2000).state.CarData, { "1": [120, 3, 0, 104] });
});
