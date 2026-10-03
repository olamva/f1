import assert from "node:assert/strict";
import { test } from "node:test";
import { rejoin, rows } from "../src/web/live/view.ts";

const LOSS = { normal: 22, sc: 13, vsc: 16 };

const race = (status: string) => ({
  TrackStatus: { Status: status },
  DriverList: Object.fromEntries(
    ["1 VER", "16 LEC", "4 NOR", "44 HAM", "22 TSU"].map((d) => {
      const [n, Tla] = d.split(" ");
      return [n, { Tla }];
    }),
  ),
  TimingData: {
    Lines: {
      1: { Position: "1", GapToLeader: "LAP 20" },
      16: { Position: "2", GapToLeader: "+16.000" },
      4: {
        Position: "3",
        GapToLeader: "+30.000",
        LastLapTime: { Value: "1:30.000" },
      },
      44: { Position: "4", GapToLeader: "+45.000" },
      22: { Position: "5", GapToLeader: "1L" },
    },
  },
});

const line = (status: string, number: string) => {
  const state = race(status);
  const drivers = rows(state);
  const pit = rejoin(state, drivers, number, LOSS);
  return pit && `${pit.label} above ${drivers[pit.before]?.tla}`;
};

test("the pit line sits above the first car behind the gap plus the pit loss for the track status", () => {
  assert.equal(line("1", "16"), "LEC · pit · +8.0 above HAM");
  assert.equal(line("4", "16"), "LEC · pit · +29.0 above NOR");
  assert.equal(line("6", "16"), "LEC · pit · +2.0 above HAM");
  assert.equal(line("4", "1"), "VER · pit · Leader above LEC");
  assert.equal(line("1", "44"), "HAM · pit · +37.0 above TSU");
  assert.equal(line("1", "22"), null);
});

test("the map ring sits the rest of the gap behind the car above the pit line", () => {
  const state = race("1");
  const pit = rejoin(state, rows(state), "16", LOSS);
  assert.equal(pit?.anchor, "4");
  assert.equal(pit?.back, 8 / 90);
});
