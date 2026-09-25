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
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
        {title}
      </h2>
      {table.length >= 3 && (
        <div className="mb-4 grid grid-cols-3 items-end gap-2 pt-2 text-center">
          {table.slice(0, 3).map((s, i) => (
            <div
              key={s.id}
              className={`min-w-0 ${["order-2", "order-1", "order-3"][i]}`}
            >
              <div className="mb-2 flex min-h-10 items-end justify-center text-xs font-medium break-words">
                {who.get(s.id)?.name ?? s.id}
              </div>
              <div
                className={`flex flex-col items-center justify-center rounded-t-lg ${["h-24", "h-16", "h-12"][i]}`}
                style={{
                  backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${who.get(s.id)?.color ?? "#888888"} 35%, #27272a), #27272a 25%)`,
                }}
              >
                <span className="text-xl font-bold">{i + 1}</span>
                <span className="tabular text-xs text-zinc-400">
                  {s.points} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <table className="tabular w-full text-sm">
        <tbody>
          {table.map((s, i) => {
            const w = who.get(s.id);
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
