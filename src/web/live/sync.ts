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

export const lapSync = (
  changes: (number | null)[],
  tap: number,
  current: number,
): number | null =>
  changes
    .flatMap((t) =>
      t !== null && t <= tap ? [Math.round((tap - t) / 1000)] : [],
    )
    .reduce<number | null>(
      (best, s) =>
        best === null || Math.abs(s - current) < Math.abs(best - current)
          ? s
          : best,
      null,
    );

export const clockSync = (
  clock: ClockState | null,
  tap: number,
  current: number,
): number | null => {
  const left = clock?.Extrapolating ? clockLeft(clock, tap) : null;
  if (left === null || Number.isNaN(left)) return null;
  const r = (((-left / 1000) % 60) + 60) % 60;
  return Math.round(r + 60 * Math.max(0, Math.round((current - r) / 60)));
};

export const splitSync = (s: number, delay: number, rewound: boolean) => {
  const d = rewound || s > MAX_DELAY_S ? Math.min(delay, s) : s;
  return [d, s - d];
};
