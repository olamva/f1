import { lapSeconds } from "../../shared/timing.ts";
import { qualifyingPart, type Row } from "./view.ts";

type Obj = Record<string, any>;

export const knockout = (state: Obj): number | null =>
  (qualifyingPart(state) &&
    Number(state.TimingData.NoEntries?.[state.TimingData.SessionPart])) ||
  null;

const partBest = (line: Obj | undefined, part: number) =>
  lapSeconds(line?.BestLapTimes?.[part - 1]?.Value ?? "");

export const cutGaps = (tower: Row[], state: Obj): Row[] => {
  const cut = knockout(state);
  const part = state.TimingData?.SessionPart;
  const lines: Obj = state.TimingData?.Lines ?? {};
  const limit = cut && partBest(lines[tower[cut - 1]?.number ?? ""], part);
  if (!cut || !limit) return tower;
  return tower.map((r, i) => {
    const time = partBest(lines[r.number], part);
    const skip = i === cut - 1 || r.status === "KO" || time === null;
    const gap = skip ? "" : (time - limit).toFixed(3);
    return { ...r, gap: gap && !gap.startsWith("-") ? `+${gap}` : gap };
  });
};
