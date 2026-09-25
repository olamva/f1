import assert from "node:assert/strict";
import { test } from "node:test";
import { sprintQualifying } from "../src/server/season.ts";
import type { Round } from "../src/shared/season.ts";

const responses: Record<string, unknown> = {
  "https://api.jolpi.ca/f1/alpha/schedules/2026/": {
    data: {
      events: [
        { round: { id: "round_a", number: 1 }, schedule: [] },
        { round: { id: "round_b", number: 2 }, schedule: [] },
      ],
    },
  },
  "https://api.jolpi.ca/f1/alpha/results/round_b/SQ/": {
    data: {
      results: [
        { driver: { given_name: "George", family_name: "Russell" }, position: 1 },
        { driver: { given_name: "Kimi", family_name: "Antonelli" }, position: 2 },
      ],
    },
  },
};

test("sprintQualifying reads jolpica alpha schedules and results", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    Response.json(responses[url]),
  );
  const round = (n: number, sq: string | null) =>
    ({ round: n, sessions: { sprintQualifying: sq } }) as Round;
  const result = await sprintQualifying(
    2026,
    [round(1, null), round(2, "2026-03-13T07:30:00Z")],
    [
      { id: "russell", code: "RUS", name: "George Russell", number: "63", team: "mercedes" },
      { id: "antonelli", code: "ANT", name: "Kimi Antonelli", number: "12", team: "mercedes" },
    ],
  );
  assert.deepEqual(
    result.map((r) => [r.round, r.results.map((x) => [x.driver, x.position])]),
    [[2, [["russell", 1], ["antonelli", 2]]]],
  );
});
