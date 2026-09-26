import assert from "node:assert/strict";
import { test } from "node:test";
import {
  reminders,
  schedule,
  shouldWake,
  windows,
} from "../scripts/sessions.ts";

const race = (date: string, time = "14:00:00Z") => ({
  raceName: "Test Grand Prix",
  date,
  time,
  FirstPractice: { date, time: "10:00:00Z" },
});
const at = (value: string) => Date.parse(value);
const response = (races: unknown) =>
  new Response(JSON.stringify({ MRData: { RaceTable: { Races: races } } }));

test("calendar changes take effect on the next check", async () => {
  let start = "14:00:00Z";
  const request = async (url: string | URL | Request) =>
    response(
      String(url).includes("/2027.json") ? [] : [race("2026-10-04", start)],
    );
  const now = at("2026-10-04T13:45:00Z");
  assert.ok((await schedule(now, request)).some((w) => w.start === now));
  start = "18:00:00Z";
  assert.ok(!(await schedule(now, request)).some((w) => w.start === now));
  assert.equal(
    shouldWake(await schedule(now, request), at("2026-10-04T18:05:00Z")),
    true,
  );
});

test("the next season loads without changing the year in code", async () => {
  const years: string[] = [];
  const request = async (url: string | URL | Request) => {
    years.push(String(url));
    return response(
      String(url).includes("/2028.json")
        ? [race("2028-03-01")]
        : [race("2027-12-01")],
    );
  };
  const result = await schedule(at("2027-12-31T00:00:00Z"), request);
  assert.equal(shouldWake(result, at("2028-03-01T13:45:00Z")), true);
  assert.ok(years.some((url) => url.includes("/2028.json")));
});

test("a delayed session wakes outside its planned window and can then scale down", () => {
  const result = windows([race("2026-10-04")]);
  assert.equal(shouldWake(result, at("2026-10-04T20:00:00Z")), true);
  assert.equal(shouldWake(result, at("2026-10-04T20:05:00Z")), false);
  assert.equal(shouldWake(result, at("2026-10-04T20:15:00Z")), true);
  assert.equal(shouldWake(result, at("2026-10-07T20:00:00Z")), false);
});

test("a failed next-season request keeps the current schedule", async () => {
  const request = async (url: string | URL | Request) => {
    if (String(url).includes("/2027.json")) throw new Error("unavailable");
    return response([race("2026-10-04")]);
  };
  assert.equal(
    shouldWake(
      await schedule(at("2026-10-04T14:00:00Z"), request),
      at("2026-10-04T14:00:00Z"),
    ),
    true,
  );
});

test("past calendar dates do not wake the app in later years", () => {
  const result = windows([race("2026-10-04")]);
  assert.equal(shouldWake(result, at("2027-10-04T14:00:00Z")), false);
});

test("each session gets one reminder 15 minutes and one 5 minutes before it starts", () => {
  const result = windows([race("2026-10-04", "14:03:00Z")]);
  const sent = [];
  for (
    let slot = at("2026-10-04T08:00:00Z");
    slot < at("2026-10-04T15:00:00Z");
    slot += 5 * 60_000
  )
    for (const message of reminders(result, slot + 50_000))
      sent.push([
        new Date(slot).toISOString().slice(11, 16),
        message.title,
        message.body,
      ]);
  assert.deepEqual(sent, [
    ["09:45", "Test Grand Prix · Practice 1", "Starts in 15 minutes."],
    ["09:55", "Test Grand Prix · Practice 1", "Starts in 5 minutes."],
    ["13:50", "Test Grand Prix · Race", "Starts in 15 minutes."],
    ["14:00", "Test Grand Prix · Race", "Starts in 5 minutes."],
  ]);
});
