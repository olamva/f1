import type { LapRow, Period } from "../../shared/timing.ts";
import type { Band } from "../charts/LineChart.tsx";

const STYLE = {
  sc: { label: "SC", className: "fill-amber-400/25" },
  vsc: { label: "VSC", className: "fill-amber-200/15" },
};

const lapAt = (laps: LapRow[], t: number) => {
  const i = laps.findLastIndex((l) => l.t <= t);
  const lap = laps[Math.max(i, 0)];
  const next = laps[i + 1];
  return !lap || i < 0 || !next
    ? (lap?.lap ?? 0)
    : lap.lap + (t - lap.t) / (next.t - lap.t);
};

export const bandsOf = (
  periods: Period[] | null | undefined,
  laps: LapRow[],
  until: number,
): Band[] =>
  (periods ?? [])
    .filter((p) => p.kind !== "red" && p.from <= until)
    .map((p) => ({
      ...STYLE[p.kind as "sc" | "vsc"],
      from: lapAt(laps, p.from),
      to: lapAt(laps, Math.min(p.to ?? until, until)),
    }))
    .filter((b) => b.to > b.from);
