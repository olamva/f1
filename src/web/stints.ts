import type { Stints } from "../shared/season.ts";
import { useJson } from "./api.ts";

export const useStints = (
  year: string,
  round: number | undefined,
  kind: "race" | "sprint",
) => {
  const { data } = useJson<Stints>(
    round && Number(year) >= 2018
      ? `/api/stints/${year}/${round}/${kind}`
      : null,
  );
  const laps = Math.max(
    0,
    ...Object.values(data ?? {})
      .flat()
      .map((stint) => stint.to),
  );
  return { stints: laps ? data : null, laps };
};
