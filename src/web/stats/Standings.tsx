import {
  hasClinched,
  type Championship,
  type Standing,
  type Upcoming,
} from "../../shared/clinch.ts";
import { Podium } from "../Podium.tsx";
import type { Who } from "./derive.ts";

interface StandingsTableProps {
  title: string;
  table: Standing[];
  who: Map<string, Who>;
  events: Upcoming[];
  champ: Championship;
}

export const StandingsTable = ({
  title,
  table,
  who,
  events,
  champ,
}: StandingsTableProps) => {
  const lead = table[0]?.points ?? 0;
  const start = table.length >= 3 ? 3 : 0;
  return (
    <section className="bg-surface rounded-xl p-3">
      <h2 className="mb-2 hidden text-xs font-semibold tracking-wider text-zinc-400 uppercase xl:block">
        {title}
      </h2>
      {table.length >= 3 && (
        <Podium
          entries={table.map((s) => ({
            id: s.id,
            name: who.get(s.id)?.name ?? s.id,
            color: who.get(s.id)?.color ?? "#888888",
            value: `${s.points} pts`,
          }))}
          crowned={hasClinched(table, events, table[0].id, champ)}
        />
      )}
      <table className="tabular w-full text-sm">
        <tbody>
          {table.slice(start).map((s, index) => {
            const w = who.get(s.id);
            const i = start + index;
            return (
              <tr key={s.id} className="border-t border-zinc-800">
                <td className="w-8 py-1 text-right text-zinc-500">
                  {["🥇", "🥈", "🥉"][i] ?? i + 1}
                </td>
                <td className="px-3 py-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-1 rounded-sm"
                      style={{ background: w?.color }}
                    />
                    {w?.name ?? s.id}
                  </span>
                </td>
                <td className="py-1 text-right font-semibold">{s.points}</td>
                <td className="w-16 py-1 text-right text-zinc-500">
                  {i ? `-${lead - s.points}` : ""}
                </td>
                <td className="w-16 py-1 text-right text-zinc-500">
                  {s.countback[0] ? (
                    <span aria-label={`${s.countback[0]} wins`}>
                      {s.countback[0]} 🏆
                    </span>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
