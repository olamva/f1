import type { Records as Career } from "../../shared/season.ts";
import { useJson } from "../api.ts";
import type { SeasonRecord, Who } from "./derive.ts";

interface RecordsProps {
  rows: SeasonRecord[];
  who: Map<string, Who>;
  hasSprints: boolean;
}

const COLUMNS: [keyof SeasonRecord, string][] = [
  ["wins", "Wins"],
  ["poles", "Poles"],
  ["podiums", "Podiums"],
  ["dnfs", "DNFs"],
  ["pointsStreak", "Points streak now"],
  ["bestPointsStreak", "Best points streak"],
  ["bestPodiumStreak", "Best podium streak"],
];
const SPRINT: [keyof SeasonRecord, string][] = [
  ["sprintStarts", "Starts"],
  ["sprintWins", "Wins"],
  ["sprintPodiums", "Podiums"],
  ["sprintPoints", "Points"],
];

const CAREER = ["starts", "wins", "podiums", "poles", "titles"] as const;

export const Records = ({ rows, who, hasSprints }: RecordsProps) => {
  const career = useJson<Career>("/api/records");
  const sorted = [...rows].sort(
    (a, b) => b.wins - a.wins || b.podiums - a.podiums || b.poles - a.poles,
  );
  return (
    <section className="bg-surface overflow-x-auto rounded-xl p-3">
      <table className="tabular w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th />
            <th
              colSpan={COLUMNS.length}
              className="border-b border-zinc-700 pb-1"
            >
              This season
            </th>
            {hasSprints && (
              <th
                colSpan={SPRINT.length}
                className="border-b border-zinc-700 pb-1"
              >
                Sprint
              </th>
            )}
            <th
              colSpan={CAREER.length}
              className="border-b border-zinc-700 pb-1"
            >
              Career
            </th>
          </tr>
          <tr>
            <th className="py-1 text-left">Driver</th>
            {COLUMNS.map(([, l]) => (
              <th key={l} className="px-2 py-1 text-right">
                {l}
              </th>
            ))}
            {hasSprints &&
              SPRINT.map(([, l]) => (
                <th key={l} className="px-2 py-1 text-right">
                  {l}
                </th>
              ))}
            {CAREER.map((k) => (
              <th key={k} className="px-2 py-1 text-right capitalize">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-t border-zinc-800">
              <td className="py-1">
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-1 rounded-sm"
                    style={{ background: who.get(r.id)?.color }}
                  />
                  {who.get(r.id)?.name ?? r.id}
                </span>
              </td>
              {COLUMNS.map(([k]) => (
                <td key={k} className="px-2 py-1 text-right">
                  {r[k] || ""}
                </td>
              ))}
              {hasSprints &&
                SPRINT.map(([k]) => (
                  <td key={k} className="px-2 py-1 text-right">
                    {r[k] ?? ""}
                  </td>
                ))}
              {CAREER.map((k) => (
                <td key={k} className="px-2 py-1 text-right text-zinc-300">
                  {career.data?.[r.id]?.[k] ?? "…"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {career.error && (
        <p className="mt-2 text-sm text-red-400">{career.error}</p>
      )}
    </section>
  );
};
