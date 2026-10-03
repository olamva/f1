import { lapSeconds, type PitLoss } from "../../shared/timing.ts";
import { gapSeconds, type Row } from "./view.ts";

const PIT_LOSS: Record<string, keyof PitLoss> = {
  "4": "sc",
  "6": "vsc",
  "7": "vsc",
};

export type Rejoin = {
  before: number;
  label: string;
  color: string;
  anchor: string;
  back: number | null;
};

export const rejoin = (
  state: Record<string, any>,
  rows: Row[],
  number: string | undefined,
  losses: PitLoss | undefined,
): Rejoin | null => {
  const seconds = (r: Row) =>
    (r.status === "OUT" ? null : gapSeconds(r.gap)) ?? Infinity;
  const loss = losses?.[PIT_LOSS[state.TrackStatus?.Status] ?? "normal"];
  const me = rows.find((r) => r.number === number);
  if (!loss || !me || me.status === "PIT" || seconds(me) === Infinity)
    return null;
  const gap = seconds(me) + loss;
  const at = rows.findIndex((r) => r !== me && seconds(r) > gap);
  const above = at < 0 ? rows : rows.slice(0, at);
  const ahead = above.findLast((r) => r !== me);
  const anchor = above.at(-1) ?? me;
  const lap = lapSeconds(anchor.lastLap);
  return {
    before: at < 0 ? rows.length : at,
    label: `${me.tla} · pit · ${ahead ? `+${(gap - seconds(ahead)).toFixed(1)}` : "Leader"}`,
    color: me.color,
    anchor: anchor.number,
    back: lap && (gap - seconds(anchor)) / lap,
  };
};
