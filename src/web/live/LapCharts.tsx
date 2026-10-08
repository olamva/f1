import { useState } from "react";
import { LineChart, type Series } from "../charts/LineChart.tsx";
import { lapTime } from "../charts/summary.ts";
import type { LapRow } from "../../shared/timing.ts";
import { lapSeconds } from "../../shared/timing.ts";
import { Tabs } from "../Tabs.tsx";
import { LapList } from "./LapList.tsx";
import { Panel } from "./Panels.tsx";
import { gapSeconds, type Row } from "./view.ts";

interface LapChartsProps {
  laps: Record<string, LapRow[]>;
  rows: Row[];
  focus: string[];
  driver?: string;
  deleted: Set<number>;
  until: number;
  race: boolean;
}

const VIEWS = ["Chart", "Laps"] as const;

const seriesOf = (
  laps: Record<string, LapRow[]>,
  rows: Row[],
  focus: string[],
  until: number,
  value: (r: LapRow) => number | null,
): Series[] => {
  const by = new Map(rows.map((r) => [r.number, r]));
  const teams = new Map<string, number>();
  return focus.map((n) => {
    const d = by.get(n);
    const team = d?.team ?? n;
    teams.set(team, (teams.get(team) ?? 0) + 1);
    const points = (laps[n] ?? [])
      .filter((r) => r.t <= until)
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
  driver,
  deleted,
  until,
  race,
}: LapChartsProps) => {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Chart");
  const raw = seriesOf(laps, rows, focus, until, (r) => lapSeconds(r.time));
  const latest = Math.max(...raw.flatMap((s) => s.points.map((p) => p[0])));
  const recent = raw.map((s) => ({
    ...s,
    points: s.points.filter(([lap]) => lap > latest - 15),
  }));
  const fastest = Math.min(...recent.flatMap((s) => s.points.map((p) => p[1])));
  const times = recent.map((s) => ({
    ...s,
    points: s.points.filter((p) => p[1] <= fastest * 1.08),
  }));
  const base = new Map(
    (driver ? (laps[driver] ?? []) : []).map((r) => [r.lap, gapSeconds(r.gap)]),
  );
  const gaps = seriesOf(laps, rows, focus, until, (r) => {
    const gap = gapSeconds(r.gap);
    if (!driver) return gap;
    const to = base.get(r.lap);
    return gap === null || to == null ? null : gap - to;
  });
  const reference = rows.find((r) => r.number === driver)?.tla;
  const hint = "No lap times yet.";
  return (
    <>
      <Panel
        title={
          view === "Chart"
            ? "Lap times (last 15, within 108% of the fastest)"
            : "Lap times"
        }
      >
        <div className="mb-2">
          <Tabs items={VIEWS} value={view} onChange={setView} small />
        </div>
        {view === "Laps" ? (
          driver ? (
            <LapList
              number={driver}
              laps={(laps[driver] ?? []).filter((r) => r.t <= until)}
              deleted={deleted}
              rows={rows}
              race={race}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              Select a driver in the timing tower.
            </p>
          )
        ) : Number.isFinite(fastest) ? (
          <LineChart
            series={times}
            xLabel="Lap"
            yFormat={lapTime}
            invert
            height={400}
            detailsBelow
          />
        ) : (
          <p className="text-sm text-zinc-500">{hint}</p>
        )}
      </Panel>
      {race && (
        <Panel
          title={reference ? `Gap to ${reference} (s)` : "Gap to leader (s)"}
        >
          <LineChart
            series={gaps}
            xLabel="Lap"
            yFormat={(v) => v.toFixed(0)}
            invert
            height={400}
            detailsBelow
          />
        </Panel>
      )}
    </>
  );
};
