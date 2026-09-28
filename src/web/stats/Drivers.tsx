import type { Standing } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { openDriver } from "../path.ts";
import type { Who } from "./derive.ts";

interface DriversProps {
  season: Season;
  who: Map<string, Who>;
  table: Standing[];
}

export const Drivers = ({ season, who, table }: DriversProps) => {
  const teams = new Map(season.teams.map((t) => [t.id, t.name]));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {season.drivers.map((driver) => {
        const color = who.get(driver.id)?.color ?? "#888888";
        const place = table.findIndex((s) => s.id === driver.id);
        const standing = table[place];
        return (
          <button
            key={driver.id}
            type="button"
            onClick={() => openDriver(driver.id)}
            className="bg-surface group relative cursor-pointer overflow-hidden rounded-xl p-4 text-left ring-1 ring-zinc-800 transition hover:-translate-y-0.5 hover:ring-zinc-600"
            style={{
              backgroundImage: `linear-gradient(135deg, ${color}40, transparent 65%)`,
            }}
          >
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: color }}
            />
            <span
              aria-hidden
              className="tabular absolute -right-1 -bottom-5 text-8xl font-black italic opacity-20 transition group-hover:opacity-35"
              style={{ color }}
            >
              {driver.number}
            </span>
            <span className="relative block text-xs font-semibold tracking-widest text-zinc-400">
              {driver.code}
            </span>
            <span className="relative mt-1 block text-lg leading-tight font-bold">
              {driver.name}
            </span>
            <span className="relative block text-sm text-zinc-400">
              {teams.get(driver.team) ?? driver.team}
            </span>
            <span className="tabular relative mt-4 flex gap-5 text-xs text-zinc-400">
              {(
                [
                  ["Pos", place < 0 ? "–" : `P${place + 1}`],
                  ["Pts", standing?.points ?? 0],
                  ["Wins", standing?.countback[0] ?? 0],
                ] as const
              ).map(([label, value]) => (
                <span key={label}>
                  {label}
                  <span className="block text-base font-semibold text-white">
                    {value}
                  </span>
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
};
