import { lapTime } from "../charts/summary.ts";
import type { LapRow } from "../../shared/timing.ts";
import { Tyre } from "./TowerTyres.tsx";
import { theoreticalBest, type Row } from "./view.ts";

interface LapListProps {
  number: string;
  laps: LapRow[];
  deleted: Set<number>;
  rows: Row[];
  race: boolean;
}

const PIT = { in: "PIT", out: "OUT" };

export const LapList = ({
  number,
  laps,
  deleted,
  rows,
  race,
}: LapListProps) => {
  const ideal = theoreticalBest(number, laps, deleted, rows);
  return (
    <div className="max-h-100 overflow-y-auto">
      {!race && ideal && (
        <p className="tabular mb-2 flex gap-2 font-mono text-sm">
          <span className="text-zinc-400">Theoretical best</span>
          <span>{lapTime(ideal.seconds)}</span>
          <span className="text-zinc-400">P{ideal.position}</span>
        </p>
      )}
      <table className="tabular w-full max-w-2xl font-mono text-xs sm:text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="px-0.5 py-1 text-right sm:px-1">Lap</th>
            <th className="px-0.5 py-1 text-right sm:px-1">Time</th>
            <th className="px-0.5 py-1 text-right sm:px-1">S1</th>
            <th className="px-0.5 py-1 text-right sm:px-1">S2</th>
            <th className="px-0.5 py-1 text-right sm:px-1">S3</th>
            <th className="px-0.5 py-1 sm:px-1">Tyre</th>
          </tr>
        </thead>
        <tbody>
          {laps.toReversed().map((l) => (
            <tr key={l.lap} className="border-t border-zinc-800">
              <td className="px-0.5 py-1 text-right text-zinc-400 sm:px-1">
                {l.lap}
              </td>
              <td
                className={`px-0.5 py-1 text-right sm:px-1 ${deleted.has(l.lap) ? "text-zinc-500 line-through" : ""}`}
              >
                {l.time}
              </td>
              {[0, 1, 2].map((i) => (
                <td
                  key={i}
                  className="px-0.5 py-1 text-right text-zinc-300 sm:px-1"
                >
                  {l.sectors[i]}
                </td>
              ))}
              <td className="px-0.5 py-1 text-zinc-400 sm:px-1">
                <span className="flex items-center gap-1">
                  <Tyre compound={l.compound} age={null} />
                  {l.pit && PIT[l.pit]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
