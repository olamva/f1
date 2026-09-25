import { LineChart, type Series } from "../charts/LineChart.tsx";
import { lapTime } from "../charts/summary.ts";
import type { LapRow } from "../../shared/timing.ts";
import { lapSeconds } from "../../shared/timing.ts";
import { Panel } from "./Panels.tsx";
import { gapSeconds, type Row } from "./view.ts";

interface LapChartsProps {
  laps: Record<string, LapRow[]>;
  rows: Row[];
  focus: string[];
  until: number | null;
  race: boolean;
}

const seriesOf = (
  laps: Record<string, LapRow[]>,
  rows: Row[],
  focus: string[],
  until: number | null,
  value: (r: LapRow) => number | null,
): Series[] => {
  const by = new Map(rows.map((r) => [r.number, r]));
  const teams = new Map<string, number>();
  return focus.map((n) => {
    const d = by.get(n);
    const team = d?.team ?? n;
    teams.set(team, (teams.get(team) ?? 0) + 1);
    const points = (laps[n] ?? [])
      .filter((r) => until === null || r.t <= until)
      .map((r) => [r.lap, value(r)] as [number, number | null])
      .filter((p): p is [number, number] => p[1] !== null);
    return {
      id: n,
      label: d?.tla ?? n,
      color: d?.color ?? "#888",
      dashed: teams.get(team)! > 1,
      points,
    };
  });
};

export const LapCharts = ({
  laps,
  rows,
  focus,
  until,
  race,
}: LapChartsProps) => {
  const raw = seriesOf(laps, rows, focus, until, (r) => lapSeconds(r.time));
  const fastest = Math.min(...raw.flatMap((s) => s.points.map((p) => p[1])));
  const times = raw.map((s) => ({
    ...s,
    points: s.points.filter((p) => p[1] <= fastest * 1.08),
  }));
  const gaps = seriesOf(laps, rows, focus, until, (r) => gapSeconds(r.gap));
  const hint = "Click drivers in the timing tower to compare them.";
  return (
    <>
      <Panel title="Lap times (within 108% of the fastest)">
        {Number.isFinite(fastest) ? (
          <LineChart series={times} xLabel="Lap" yFormat={lapTime} invert />
        ) : (
          <p className="text-sm text-zinc-500">{hint}</p>
        )}
      </Panel>
      {race && (
        <Panel title="Gap to leader (s)">
          <LineChart
            series={gaps}
            xLabel="Lap"
            yFormat={(v) => v.toFixed(0)}
            invert
          />
        </Panel>
      )}
    </>
  );
};
