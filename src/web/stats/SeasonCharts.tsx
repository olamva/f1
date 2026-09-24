import { useState } from "react";
import type { Standing } from "../../shared/clinch.ts";
import { DivergingBars } from "../charts/Bars.tsx";
import { LineChart, type Series } from "../charts/LineChart.tsx";
import { Panel } from "../live/Panels.tsx";
import type { Who } from "./derive.ts";

interface SeasonChartsProps {
  tables: Map<number, Standing[]>;
  who: Map<string, Who>;
  gains: { id: string; total: number; races: number }[];
}

const series = (
  tables: Map<number, Standing[]>,
  who: Map<string, Who>,
  ids: string[],
  value: (t: Standing[], id: string) => number,
): Series[] => {
  const seen = new Map<string, number>();
  return ids.map((id) => {
    const w = who.get(id);
    seen.set(w?.team ?? id, (seen.get(w?.team ?? id) ?? 0) + 1);
    return {
      id,
      label: w?.code ?? id,
      color: w?.color ?? "#888",
      dashed: seen.get(w?.team ?? id)! > 1,
      points: [...tables].map(
        ([round, t]) => [round, value(t, id)] as [number, number],
      ),
    };
  });
};

interface ChipsProps {
  ids: string[];
  who: Map<string, Who>;
  on: Set<string>;
  toggle: (id: string) => void;
}

const Chips = ({ ids, who, on, toggle }: ChipsProps) => (
  <div className="mb-3 flex flex-wrap gap-1.5">
    {ids.map((id) => (
      <button
        key={id}
        onClick={() => toggle(id)}
        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${on.has(id) ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-500"}`}
      >
        <span
          className="size-2 rounded-full"
          style={{ background: who.get(id)?.color }}
        />
        {who.get(id)?.code ?? id}
      </button>
    ))}
  </div>
);

export const SeasonCharts = ({ tables, who, gains }: SeasonChartsProps) => {
  const order = ([...tables.values()].at(-1) ?? []).map((s) => s.id);
  const [on, setOn] = useState(new Set(order.slice(0, 6)));
  const toggle = (id: string) =>
    setOn((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const ids = order.filter((id) => on.has(id));
  const points = series(
    tables,
    who,
    ids,
    (t, id) => t.find((s) => s.id === id)?.points ?? 0,
  );
  const places = series(
    tables,
    who,
    ids,
    (t, id) => t.findIndex((s) => s.id === id) + 1,
  );
  return (
    <div className="space-y-4">
      <Chips ids={order} who={who} on={on} toggle={toggle} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Championship points progression (races and sprints)">
          <LineChart series={points} xLabel="Round" />
        </Panel>
        <Panel title="Championship position">
          <LineChart
            series={places}
            xLabel="Round"
            invert
            yDomain={[
              1,
              Math.max(10, ...places.flatMap((s) => s.points.map((p) => p[1]))),
            ]}
            yFormat={(v) => `P${v}`}
          />
        </Panel>
      </div>
      <Panel title="Places gained from grid to finish (classified races)">
        <DivergingBars
          bars={gains.map((g) => ({
            id: g.id,
            label: who.get(g.id)?.code ?? g.id,
            color: who.get(g.id)?.color ?? "#888",
            value: g.total,
          }))}
          format={(v) => (v > 0 ? `+${v}` : String(v))}
        />
      </Panel>
    </div>
  );
};
