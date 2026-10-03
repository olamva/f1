import assert from "node:assert/strict";
import { test } from "node:test";
import type { Round } from "../src/shared/season.ts";
import { prediction, titleOpen } from "../src/web/live/prediction.ts";

const finale: Round = {
  round: 24,
  name: "Abu Dhabi Grand Prix",
  circuit: "Yas Marina Circuit",
  country: "UAE",
  sessions: {
    fp1: null,
    fp2: null,
    fp3: null,
    sprintQualifying: "2026-12-04T13:30:00Z",
    sprint: "2026-12-05T12:00:00Z",
    qualifying: "2026-12-05T16:00:00Z",
    race: "2026-12-06T13:00:00Z",
  },
};

const standings = (leader: number, rival: number) => ({
  Drivers: {
    "1": { RacingNumber: "1", CurrentPoints: leader },
    "4": { RacingNumber: "4", CurrentPoints: rival },
  },
});

const at = (start: string) => ({
  SessionInfo: { StartDate: start, GmtOffset: "04:00:00" },
});

test("the title stays open while the current session can close the gap, and a sprint run the day before no longer counts", () => {
  const race = at("2026-12-06T17:00:00");
  const sprint = at("2026-12-05T16:00:00");
  assert.equal(
    titleOpen({ ...race, ChampionshipPrediction: standings(100, 76) }, [
      finale,
    ]),
    true,
  );
  assert.equal(
    titleOpen({ ...race, ChampionshipPrediction: standings(100, 70) }, [
      finale,
    ]),
    false,
  );
  assert.equal(
    titleOpen({ ...sprint, ChampionshipPrediction: standings(100, 70) }, [
      finale,
    ]),
    true,
  );
});

test("the prediction lists drivers by predicted place with the places each one gains", () => {
  const drivers = prediction({
    DriverList: { "1": { Tla: "NOR" }, "4": { Tla: "PIA" } },
    ChampionshipPrediction: {
      Drivers: {
        "4": {
          RacingNumber: "4",
          CurrentPosition: 1,
          PredictedPosition: 2,
          PredictedPoints: 300,
        },
        "1": {
          RacingNumber: "1",
          CurrentPosition: 2,
          PredictedPosition: 1,
          PredictedPoints: 310,
        },
        "43": {
          RacingNumber: "43",
          CurrentPosition: 3,
          PredictedPosition: 3,
          PredictedPoints: 20,
        },
      },
    },
  });
  assert.deepEqual(
    drivers.map(({ tla, points, gained }) => [tla, points, gained]),
    [
      ["NOR", 310, 1],
      ["PIA", 300, -1],
      ["43", 20, 0],
    ],
  );
});
