import { MAX_DELAY_S } from "../delay.ts";
export type ClockState = {
  Remaining?: string;
  Extrapolating?: boolean;
  Utc?: string;
};

export const clockLeft = (
  clock: ClockState | undefined,
  utcNow: number,
): number | null => {
  if (!clock?.Remaining) return null;
  const [h, m, s] = String(clock.Remaining).split(":").map(Number);
  const left = ((h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)) * 1000;
  return clock.Extrapolating
    ? left - Math.max(0, utcNow - Date.parse(clock.Utc ?? ""))
    : left;
};

export type Latest = { lapAt: number | null; clock: ClockState | null };

const within = (s: number) =>
  Math.round(s) >= 0 && Math.round(s) <= MAX_DELAY_S;

export const lapSync = (lapAt: number | null, tap: number): number | null => {
  const s = lapAt === null ? NaN : (tap - lapAt) / 1000;
  return within(s) ? Math.round(s) : null;
};

export const clockSync = (
  clock: ClockState | null,
  tap: number,
  current: number,
): number | null => {
  const left = clock?.Extrapolating ? clockLeft(clock, tap) : null;
  if (left === null || Number.isNaN(left)) return null;
  const r = (((left / 1000) % 60) + 60) % 60;
  const s = r + 60 * Math.max(0, Math.round((current - r) / 60));
  return within(s) ? Math.round(s) : null;
};
