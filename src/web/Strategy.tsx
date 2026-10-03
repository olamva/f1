import type { RaceArchive, Stint, Stints } from "../shared/season.ts";
import { FAVOURITE_ROW } from "./favourite.ts";
import { TeamLogo } from "./TeamLogo.tsx";
import { Compound, tyreColor } from "./Tyre.tsx";

const describe = (stint: Stint) =>
  `${stint.compound[0] + stint.compound.slice(1).toLowerCase()}, ${stint.new ? "new" : "used"} set: laps ${stint.from}–${stint.to}`;

interface LineProps {
  stints: Stint[];
  at: (lap: number) => string;
}

const Line = ({ stints, at }: LineProps) => {
  const last = stints.at(-1);
  return (
    <div className="relative mx-2.5 h-5">
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-zinc-800" />
      {stints.map((stint) => (
        <span
          key={`line:${stint.from}`}
          className={`absolute top-1/2 -translate-y-1/2 border-t-2 ${stint.new ? "" : "border-dashed"} ${tyreColor(stint.compound)}`}
          style={{
            left: at(stint.from - 1),
            width: at(stint.to - stint.from + 1),
          }}
        />
      ))}
      {stints.map((stint) => (
        <span
          key={stint.from}
          title={describe(stint)}
          className="absolute top-0 -translate-x-1/2"
          style={{ left: at(stint.from - 1) }}
        >
          <Compound compound={stint.compound} className="bg-zinc-950" />
        </span>
      ))}
      {last && (
        <span
          title={`${last.to - last.from + 1} laps on the last set`}
          className={`absolute top-0 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-current text-[10px] font-bold ${tyreColor(last.compound)}`}
          style={{ left: at(last.to) }}
        >
          <span className="text-zinc-950">{last.to - last.from + 1}</span>
        </span>
      )}
    </div>
  );
};

interface StrategyProps {
  rows: RaceArchive["races"][number]["results"];
  stints: Stints;
  favourite?: string;
}

export const Strategy = ({ rows, stints, favourite }: StrategyProps) => {
  const laps = Math.max(
    1,
    ...Object.values(stints)
      .flat()
      .map((stint) => stint.to),
  );
  const at = (lap: number) => `${(lap / laps) * 100}%`;
  return (
    <div className="tabular text-xs">
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] pb-1 text-[10px] text-zinc-500">
        <span />
        <div className="relative mx-2.5 h-4">
          {Array.from(
            { length: Math.floor(laps / 10) + 1 },
            (_, i) => i * 10,
          ).map((lap) => (
            <span
              key={lap}
              className="absolute -translate-x-1/2"
              style={{ left: at(lap) }}
            >
              {lap}
            </span>
          ))}
        </div>
      </div>
      <ol>
        {rows.map((result) => (
          <li
            key={result.driver}
            className={`grid grid-cols-[5.5rem_minmax(0,1fr)] items-center rounded py-1.5 ${result.driver === favourite ? FAVOURITE_ROW : ""}`}
          >
            <span className="flex items-center">
              <span className="w-6 text-zinc-500">{result.positionText}</span>
              <TeamLogo team={result.team} className="mr-1.5 h-4 w-6" />
              {result.code}
            </span>
            <Line stints={stints[result.number] ?? []} at={at} />
          </li>
        ))}
      </ol>
      {Object.values(stints)
        .flat()
        .some((stint) => !stint.new) && (
        <p className="mt-3 flex items-center gap-2 text-zinc-500">
          <span className="w-5 border-t-2 border-dashed border-zinc-400" />
          Used set
        </p>
      )}
    </div>
  );
};
