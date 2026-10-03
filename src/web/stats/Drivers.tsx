import { Star } from "lucide-react";
import type { Standing } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { useFavourite } from "../favourite.ts";
import { openDriver } from "../path.ts";
import type { Who } from "./derive.ts";
import { TeamNumber } from "./TeamNumber.tsx";

interface DriversProps {
  season: Season;
  who: Map<string, Who>;
  table: Standing[];
}

export const Drivers = ({ season, who, table }: DriversProps) => {
  const teams = new Map(season.teams.map((t) => [t.id, t.name]));
  const favourite = useFavourite()?.id;
  const drivers = [...season.drivers].sort(
    (a, b) => Number(b.id === favourite) - Number(a.id === favourite),
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {drivers.map((driver) => {
        const big = driver.id === favourite;
        const color = who.get(driver.id)?.color ?? "#888888";
        const place = table.findIndex((s) => s.id === driver.id);
        const standing = table[place];
        return (
          <button
            key={driver.id}
            type="button"
            onClick={() => openDriver(driver.id)}
            className={`bg-surface group relative cursor-pointer overflow-hidden rounded-xl text-left transition hover:-translate-y-0.5 ${big ? "col-span-full p-6 sm:p-8" : "p-4 ring-1 ring-zinc-800 hover:ring-zinc-600"}`}
            style={{
              backgroundImage: big
                ? `linear-gradient(135deg, ${color}99, ${color}26 55%, transparent 85%)`
                : `linear-gradient(135deg, ${color}40, transparent 65%)`,
              ...(big && {
                boxShadow: `0 0 0 2px ${color}, 0 12px 48px -12px ${color}`,
              }),
            }}
          >
            <TeamNumber
              id={driver.id}
              number={driver.number}
              color={color}
              className={`absolute flex items-end transition ${big ? "right-6 bottom-6 h-16 text-7xl opacity-60 group-hover:opacity-80 sm:right-8 sm:bottom-8 sm:h-40 sm:text-[11rem]" : "right-4 bottom-4 h-16 text-7xl opacity-30 group-hover:opacity-50 sm:h-20 sm:text-8xl"}`}
            />
            <span className="relative flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
              {driver.code}
              {big && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-yellow-300 uppercase">
                  <Star aria-hidden="true" className="size-3 fill-current" />
                  Favourite
                </span>
              )}
            </span>
            <span
              className={`font-f1 relative mt-1 block leading-tight font-bold ${big ? "text-3xl sm:text-5xl" : "text-lg"}`}
            >
              {driver.name}
            </span>
            <span className="relative block text-sm text-zinc-400">
              {teams.get(driver.team) ?? driver.team}
            </span>
            <span
              className={`tabular relative flex text-xs text-zinc-400 ${big ? "mt-8 gap-5 sm:gap-8" : "mt-4 gap-5"}`}
            >
              {(
                [
                  ["Pos", place < 0 ? "–" : `P${place + 1}`],
                  ["Pts", standing?.points ?? 0],
                  ["Wins", standing?.countback[0] ?? 0],
                ] as const
              ).map(([label, value]) => (
                <span key={label}>
                  {label}
                  <span
                    className={`font-f1 block font-bold text-white ${big ? "text-2xl sm:text-3xl" : "text-base"}`}
                  >
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
