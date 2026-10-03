import type { RaceArchive, Stints } from "../shared/season.ts";
import { useJson } from "./api.ts";
import { FAVOURITE_ROW } from "./favourite.ts";
import { TYRE } from "./live/TimingTower.tsx";

const USED =
  "bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(0_0_0/0.45)_3px_6px)]";

const label = (compound: string) =>
  compound[0] + compound.slice(1).toLowerCase();

interface StrategyProps {
  year: string;
  round: number;
  kind: "race" | "sprint";
  rows: RaceArchive["races"][number]["results"];
  favourite?: string;
}

export const Strategy = ({
  year,
  round,
  kind,
  rows,
  favourite,
}: StrategyProps) => {
  const { data } = useJson<Stints>(
    Number(year) >= 2018 ? `/api/stints/${year}/${round}/${kind}` : null,
  );
  const all = Object.values(data ?? {}).flat();
  const laps = Math.max(0, ...all.map((stint) => stint.to));
  if (!laps) return null;
  const compounds = new Set(all.map((stint) => stint.compound));
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
          Tyre strategy
        </h3>
        <ul className="flex flex-wrap gap-3 text-xs text-zinc-400">
          {Object.keys(TYRE)
            .filter((compound) => compounds.has(compound))
            .map((compound) => (
              <li key={compound} className="flex items-center gap-1.5">
                <span
                  className={`size-3 rounded-sm bg-current ${TYRE[compound]}`}
                />
                {label(compound)}
              </li>
            ))}
          {all.some((stint) => !stint.new) && (
            <li className="flex items-center gap-1.5">
              <span className={`size-3 rounded-sm bg-zinc-400 ${USED}`} />
              Used set
            </li>
          )}
        </ul>
      </div>
      <ol className="space-y-1">
        {rows.map((result) => {
          const stints = data?.[result.number] ?? [];
          return (
            <li
              key={result.driver}
              className={`grid grid-cols-[3.5rem_minmax(0,1fr)] items-center rounded hover:bg-zinc-800/50 ${result.driver === favourite ? FAVOURITE_ROW : ""}`}
            >
              <span className="tabular text-xs">
                <span className="inline-block w-5 text-zinc-500">
                  {result.positionText}
                </span>
                {result.code}
              </span>
              <div
                className="flex h-5 gap-0.5"
                style={{ width: `${((stints.at(-1)?.to ?? 0) / laps) * 100}%` }}
              >
                {stints.map((stint) => (
                  <div
                    key={stint.from}
                    title={`${label(stint.compound)}, ${stint.new ? "new" : "used"} set: laps ${stint.from}–${stint.to}`}
                    className={`@container flex basis-0 items-center justify-center bg-current last:rounded-r ${TYRE[stint.compound] ?? "text-zinc-400"} ${stint.new ? "" : USED}`}
                    style={{ flexGrow: stint.to - stint.from + 1 }}
                  >
                    <span className="tabular hidden rounded-sm bg-current px-1 text-[10px] leading-4 font-semibold @min-[1.5rem]:block">
                      <span className="text-zinc-950">
                        {stint.compound[0]}
                        <span className="hidden @min-[4.5rem]:inline">
                          {" "}
                          {stint.from}–{stint.to}
                        </span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
