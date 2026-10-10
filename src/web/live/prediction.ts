import { hasClinched } from "../../shared/clinch.ts";
import type { Round } from "../../shared/season.ts";
import { sessionStart } from "./view.ts";

type Obj = Record<string, any>;

const predicted = (state: Obj): Obj[] =>
  Object.values(state.ChampionshipPrediction?.Drivers ?? {});

export type Prediction = {
  number: string;
  tla: string;
  name: string;
  team: string;
  position: number;
  points: number;
  gained: number;
  gain: number;
};

export const prediction = (state: Obj): Prediction[] => {
  const drivers: Obj = state.DriverList ?? {};
  return predicted(state)
    .map((p) => {
      const d: Obj = drivers[p.RacingNumber] ?? {};
      return {
        number: p.RacingNumber,
        tla: d.Tla ?? p.RacingNumber,
        name: d.FullName ?? "",
        team: d.TeamName ?? "",
        position: p.PredictedPosition,
        points: p.PredictedPoints,
        gained: p.CurrentPosition - p.PredictedPosition,
        gain: p.PredictedPoints - p.CurrentPoints,
      };
    })
    .sort((a, b) => a.position - b.position);
};

export const titleOpen = (state: Obj, rounds: Round[]): boolean => {
  const day = new Date(sessionStart(state) ?? 0).toISOString().slice(0, 10);
  const events = rounds.flatMap((r) =>
    (["sprint", "race"] as const)
      .filter((kind) => (r.sessions[kind] ?? "") >= day)
      .map((kind) => ({ round: r.round, name: r.name, kind })),
  );
  const table = predicted(state)
    .map((p) => ({
      id: p.RacingNumber,
      points: p.CurrentPoints,
      countback: [],
    }))
    .sort((a, b) => b.points - a.points);
  return !!table[0] && !hasClinched(table, events, table[0].id, "drivers");
};
