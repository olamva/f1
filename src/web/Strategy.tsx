import type { Stint, Stints } from "../shared/season.ts";
import { Compound, tyreColor } from "./Tyre.tsx";

const describe = (stint: Stint) =>
  `${stint.compound[0] + stint.compound.slice(1).toLowerCase()}, ${stint.new ? "new" : "used"} set: laps ${stint.from}–${stint.to}`;

interface StrategyProps {
  stints: Stint[];
  laps: number;
}

export const Strategy = ({ stints, laps }: StrategyProps) => {
  const at = (lap: number) => `${(lap / laps) * 100}%`;
  const last = stints.at(-1);
  return (
    <div className="pointer-events-none relative mx-2.5 h-5">
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
          className="pointer-events-auto absolute top-0 -translate-x-1/2"
          style={{ left: at(stint.from - 1) }}
        >
          <Compound compound={stint.compound} className="bg-zinc-950" />
        </span>
      ))}
      {last && (
        <span
          title={`${last.to - last.from + 1} laps on the last set`}
          className={`pointer-events-auto absolute top-0 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-current text-[10px] font-bold ${tyreColor(last.compound)}`}
          style={{ left: at(last.to) }}
        >
          <span className="tabular text-zinc-950">
            {last.to - last.from + 1}
          </span>
        </span>
      )}
    </div>
  );
};

interface LapAxisProps {
  laps: number;
}

export const LapAxis = ({ laps }: LapAxisProps) => (
  <div className="relative mx-2.5 h-4">
    {Array.from({ length: Math.floor(laps / 10) + 1 }, (_, i) => i * 10).map(
      (lap) => (
        <span
          key={lap}
          className="absolute -translate-x-1/2 text-[10px] font-normal"
          style={{ left: `${(lap / laps) * 100}%` }}
        >
          {lap}
        </span>
      ),
    )}
  </div>
);

interface UsedSetProps {
  stints: Stints;
}

export const UsedSet = ({ stints }: UsedSetProps) =>
  Object.values(stints).some((list) => list.some((stint) => !stint.new)) && (
    <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
      <span className="w-5 border-t-2 border-dashed border-zinc-400" />
      Used set
    </p>
  );
