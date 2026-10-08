import { lapSeconds, type LapRow } from "../../shared/timing.ts";

export type LongRun = {
  number: string;
  compound: string;
  laps: number;
  mean: number;
};

const MIN_LAPS = 5;
const SLOW = 1.07;

const median = (values: number[]): number => {
  const s = values.toSorted((a, b) => a - b);
  return (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2;
};

const stintsOf = (laps: LapRow[]): LapRow[][] =>
  laps.reduce<LapRow[][]>((stints, lap, i) => {
    const prev = laps[i - 1];
    const split =
      !prev ||
      prev.pit !== undefined ||
      lap.pit === "out" ||
      lap.lap !== prev.lap + 1 ||
      lap.compound !== prev.compound;
    if (split) stints.push([]);
    stints.at(-1)!.push(lap);
    return stints;
  }, []);

export const longRuns = (
  laps: Record<string, LapRow[]>,
  until: number,
): LongRun[] =>
  Object.entries(laps)
    .flatMap(([number, rows]) =>
      stintsOf(rows.filter((l) => l.t <= until)).flatMap((stint) => {
        const times = stint
          .filter((l) => l.pit === undefined)
          .map((l) => lapSeconds(l.time))
          .filter((t): t is number => t !== null);
        const limit = median(times) * SLOW;
        const kept = times.filter((t) => t <= limit);
        return kept.length >= MIN_LAPS
          ? [
              {
                number,
                compound: stint[0]!.compound,
                laps: kept.length,
                mean: kept.reduce((a, b) => a + b, 0) / kept.length,
              },
            ]
          : [];
      }),
    )
    .sort((a, b) => a.mean - b.mean);
