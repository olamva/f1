import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStream } from "../src/server/timing.ts";
import { merge, type Json } from "../src/shared/merge.ts";
import { compass, trackTemps } from "../src/web/live/view.ts";

const stream = `﻿00:01:00.108{"Series":[{"Timestamp":"2025-12-07T12:06:07.17Z","Weather":{"TrackTemp":"34.6"}}]}
00:02:00.124{"Series":{"1":{"Timestamp":"2025-12-07T12:07:07.186Z","Weather":{"TrackTemp":"34.4"}}}}
00:02:30.000{"Series":{"2":{"Timestamp":"2025-12-07T12:07:37.186Z","Weather":{"TrackTemp":"0.0"}}}}
00:03:00.131{"Series":{"3":{"Timestamp":"2025-12-07T12:08:07.193Z","Weather":{"TrackTemp":"35.1"}}}}`;

test("the track temperature trend follows the weather series in order and skips sensor dropouts", () => {
  const state = parseStream(stream, "WeatherDataSeries").reduce<Json>(
    (s, e) => merge(s, { [e.topic]: e.data }),
    {},
  );
  assert.deepEqual(
    trackTemps(state as Record<string, Json>),
    [34.6, 34.4, 35.1],
  );
});

test("the wind direction rounds to the nearest compass point", () => {
  assert.deepEqual(["0", "67", "290", "315", "350"].map(compass), [
    "N",
    "NE",
    "W",
    "NW",
    "N",
  ]);
});
