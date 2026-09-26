import assert from "node:assert/strict";
import { test } from "node:test";

test("Jolpica retries rate limits, shares its queue, and preserves cached data", async (t) => {
  let now = Date.parse("2026-09-26T12:00:00Z");
  t.mock.method(Date, "now", () => now);
  t.mock.method(
    globalThis,
    "setTimeout",
    (callback: () => void, ms: number) => {
      now += ms;
      queueMicrotask(callback);
    },
  );
  const { get, json } = await import("../src/server/jolpica.ts");
  const calls: { url: string; at: number }[] = [];
  let responses: Response[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push({ url, at: now });
    return responses.shift()!;
  });
  const data = { MRData: { total: "22" } };
  responses = [
    new Response(null, { status: 429, headers: { "Retry-After": "2" } }),
    Response.json(data),
    Response.json({ data: { events: [] } }),
  ];
  const [result] = await Promise.all([
    get("test.json"),
    json("https://api.jolpi.ca/f1/alpha/schedules/2026/"),
    get("test.json"),
  ]);
  assert.deepEqual(result, data.MRData);
  assert.equal(calls.length, 3);
  assert.equal(calls[0]!.url, calls[1]!.url);
  assert.ok(calls[1]!.at - calls[0]!.at >= 2000);
  assert.ok(calls[2]!.at - calls[1]!.at >= 300);

  for (const kind of ["missing", "invalid", "date"]) {
    const header =
      kind === "missing"
        ? undefined
        : kind === "date"
          ? new Date(now + 3000).toUTCString()
          : "invalid";
    const first: number = calls.length;
    responses = [
      new Response(null, {
        status: 429,
        headers: header ? { "Retry-After": header } : {},
      }),
      Response.json(data),
    ];
    await get(`retry-${first}.json`);
    assert.ok(
      calls[first + 1]!.at - calls[first]!.at >=
        (kind === "date" ? 2000 : 60_000),
    );
  }

  responses = Array.from(
    { length: 3 },
    () => new Response(null, { status: 429, headers: { "Retry-After": "1" } }),
  );
  const first = calls.length;
  assert.deepEqual(await Promise.all([get("test.json", 0), get("test.json")]), [
    data.MRData,
    data.MRData,
  ]);
  assert.equal(calls.length - first, 3);
  responses = [Response.json(data)];
  assert.deepEqual(await get("test.json", 0), data.MRData);

  responses = [new Response(null, { status: 403 })];
  await assert.rejects(get("forbidden.json"), /403/);
  responses = [Response.json(data)];
  assert.deepEqual(await get("forbidden.json"), data.MRData);

  responses = [
    new Response(null, { status: 429, headers: { "Retry-After": "3600" } }),
  ];
  await assert.rejects(get("limited.json"), /429/);
  const count = calls.length;
  await assert.rejects(get("during-cooldown.json"), /cooldown/);
  assert.equal(calls.length, count);
});
