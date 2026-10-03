import assert from "node:assert/strict";
import { test } from "node:test";
import { replay } from "../src/server/archive.ts";

test("the three most recently used replays load from the archive once", async (t) => {
  const loads: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/SessionInfo.jsonStream"))
      loads.push(url.split("/").at(-2)!);
    return new Response("");
  });
  for (const race of ["a", "b", "c", "a", "d", "a", "c", "d", "b"])
    await replay(`2026/meeting/${race}/`);
  assert.deepEqual(loads, ["a", "b", "c", "d", "b"]);
});
