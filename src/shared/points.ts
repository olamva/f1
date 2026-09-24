export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

export type EventKind = "race" | "sprint";

export const pointsFor = (kind: EventKind, position: number | null): number =>
  position === null
    ? 0
    : ((kind === "race" ? RACE_POINTS : SPRINT_POINTS)[position - 1] ?? 0);
