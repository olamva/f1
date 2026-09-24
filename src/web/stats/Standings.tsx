import type { Standing } from "../../shared/clinch.ts";
import type { Who } from "./derive.ts";

interface StandingsTableProps {
  title: string;
  table: Standing[];
  who: Map<string, Who>;
}

export const StandingsTable = ({ title, table, who }: StandingsTableProps) => {
  const lead = table[0]?.points ?? 0;
  return (
    <section className="rounded-xl bg-surface p-3">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">{title}</h2>
      <table className="tabular w-full text-sm">
        <tbody>
          {table.map((s, i) => {
            const w = who.get(s.id);
            return (
              <tr key={s.id} className="border-t border-zinc-800">
                <td className="w-8 py-1 text-right text-zinc-500">{i + 1}</td>
                <td className="px-3 py-1">
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-1 rounded-sm" style={{ background: w?.color }} />
                    {w?.name ?? s.id}
                  </span>
                </td>
                <td className="py-1 text-right font-semibold">{s.points}</td>
                <td className="w-16 py-1 text-right text-zinc-500">{i ? `-${lead - s.points}` : ""}</td>
                <td className="w-12 py-1 text-right text-zinc-500">{s.countback[0] ? `${s.countback[0]}W` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
