import { lapTime } from "../charts/summary.ts";
import { Compound } from "../Tyre.tsx";
import { longRuns } from "./longRuns.ts";
import { Panel } from "./Panels.tsx";
import type { Row } from "./view.ts";
import type { LapRow } from "../../shared/timing.ts";

interface LongRunsProps {
  laps: Record<string, LapRow[]>;
  rows: Row[];
  until: number;
  selected: Set<string>;
  info?: { Type?: string };
}

export const LongRuns = ({
  laps,
  rows,
  until,
  selected,
  info,
}: LongRunsProps) => {
  if (info?.Type !== "Practice") return null;
  const by = new Map(rows.map((r) => [r.number, r]));
  const runs = longRuns(laps, until);
  const best = runs[0]?.mean ?? 0;
  return (
    <Panel title="Long-run pace">
      {runs.length ? (
        <table className="tabular w-full max-w-2xl font-mono text-xs sm:text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="px-0.5 py-1 sm:px-1">Driver</th>
              <th className="px-0.5 py-1 sm:px-1">Tyre</th>
              <th className="px-0.5 py-1 text-right sm:px-1">Laps</th>
              <th className="px-0.5 py-1 text-right sm:px-1">Mean</th>
              <th className="px-0.5 py-1 text-right sm:px-1">Gap</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => (
              <tr
                key={i}
                className={`border-t border-zinc-800 ${selected.has(r.number) ? "bg-zinc-700/40" : ""}`}
              >
                <td className="px-0.5 py-1 sm:px-1">
                  <span
                    className="font-f1 font-bold"
                    style={{ color: by.get(r.number)?.color }}
                  >
                    {by.get(r.number)?.tla ?? r.number}
                  </span>
                </td>
                <td className="px-0.5 py-1 sm:px-1">
                  <Compound compound={r.compound} />
                </td>
                <td className="px-0.5 py-1 text-right text-zinc-300 sm:px-1">
                  {r.laps}
                </td>
                <td className="px-0.5 py-1 text-right sm:px-1">
                  {lapTime(r.mean)}
                </td>
                <td className="px-0.5 py-1 text-right text-zinc-400 sm:px-1">
                  {i ? `+${(r.mean - best).toFixed(3)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-zinc-500">No stint of 5 clean laps yet.</p>
      )}
    </Panel>
  );
};
