import { pointsFor, type EventKind } from "./points.ts";

export type Championship = "drivers" | "constructors";
export type Standing = { id: string; points: number; countback: number[] };
export type Upcoming = { round: number; name: string; kind: EventKind };
export type Picks = Record<string, number[]>[];

const CARS: Record<Championship, number> = { drivers: 1, constructors: 2 };

const topPositions = (champ: Championship): number[] =>
  Array.from({ length: CARS[champ] }, (_, i) => i + 1);

const score = (kind: EventKind, positions: number[]): number =>
  positions.reduce((sum, p) => sum + pointsFor(kind, p), 0);

const withFinishes = (countback: number[], positions: number[]): number[] => {
  const out = [...countback];
  for (const p of positions) out[p - 1] = (out[p - 1] ?? 0) + 1;
  return out;
};

export const addResult = (
  s: Standing,
  kind: EventKind,
  positions: number[],
): Standing => ({
  id: s.id,
  points: s.points + score(kind, positions),
  countback:
    kind === "race" ? withFinishes(s.countback, positions) : s.countback,
});

export function beatsOnCountback(a: number[], b: number[]): boolean {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

const ahead = (a: Standing, b: Standing): boolean =>
  a.points > b.points ||
  (a.points === b.points && beatsOnCountback(a.countback, b.countback));

const ceiling = (s: Standing, events: Upcoming[], champ: Championship) =>
  events.reduce((l, e) => addResult(l, e.kind, topPositions(champ)), s);

const find = (table: Standing[], id: string): Standing => {
  const s = table.find((x) => x.id === id);
  if (!s) throw new Error(`no standing for ${id}`);
  return s;
};

const beatsAll = (
  me: Standing,
  rivals: Standing[],
  remaining: Upcoming[],
  champ: Championship,
) =>
  rivals.every((r) => r.id === me.id || ahead(me, ceiling(r, remaining, champ)));

export const hasClinched = (
  table: Standing[],
  remaining: Upcoming[],
  id: string,
  champ: Championship,
): boolean => beatsAll(find(table, id), table, remaining, champ);

export const isEliminated = (
  table: Standing[],
  remaining: Upcoming[],
  id: string,
  champ: Championship,
): boolean => {
  const best = ceiling(find(table, id), remaining, champ);
  return table.some((r) => r.id !== id && ahead(r, best));
};

export type Earliest =
  | { state: "clinched" }
  | { state: "eliminated" }
  | { state: "possible"; index: number }
  | { state: "last-race-only" };

export function earliestClinch(
  table: Standing[],
  events: Upcoming[],
  id: string,
  champ: Championship,
): Earliest {
  if (hasClinched(table, events, id, champ)) return { state: "clinched" };
  if (isEliminated(table, events, id, champ)) return { state: "eliminated" };
  const me = find(table, id);
  for (let k = 0; k < events.length; k++) {
    const best = ceiling(me, events.slice(0, k + 1), champ);
    if (beatsAll(best, table, events.slice(k + 1), champ))
      return { state: "possible", index: k };
  }
  return { state: "last-race-only" };
}

export const OUTSIDE = 11;

const firstFree = (taken: Set<number>): number => {
  let p = 1;
  while (taken.has(p)) p++;
  return p;
};

function cell(
  table: Standing[],
  events: Upcoming[],
  id: string,
  rivalId: string,
  mine: number | null,
  theirs: number,
): boolean | null {
  if (mine === theirs) return null;
  const [next, ...rest] = events as [Upcoming, ...Upcoming[]];
  const taken = new Set([mine ?? 0, theirs]);
  const me = addResult(find(table, id), next.kind, mine === null ? [] : [mine]);
  return table.every((r) => {
    if (r.id === id) return true;
    const pos = r.id === rivalId ? theirs : firstFree(taken);
    return ahead(me, ceiling(addResult(r, next.kind, [pos]), rest, "drivers"));
  });
}

export type Matrix = {
  mine: (number | null)[];
  theirs: number[];
  cells: (boolean | null)[][];
};

export function clinchMatrix(
  table: Standing[],
  events: Upcoming[],
  id: string,
  rivalId: string,
): Matrix {
  const top = Array.from({ length: 10 }, (_, i) => i + 1);
  const mine = [...top, null];
  const theirs = [...top, OUTSIDE];
  return {
    mine,
    theirs,
    cells: mine.map((m) =>
      theirs.map((t) => cell(table, events, id, rivalId, m, t)),
    ),
  };
}

const teamScores = (kind: EventKind): number[] => {
  const table = Array.from({ length: 12 }, (_, i) => pointsFor(kind, i + 1));
  const all = new Set<number>([0]);
  table.forEach((a, i) => {
    all.add(a);
    table.slice(i + 1).forEach((b) => all.add(a + b));
  });
  return [...all].sort((a, b) => b - a);
};

export type Need = { rival: number; need: number | null };

export function constructorNeeds(
  table: Standing[],
  events: Upcoming[],
  id: string,
  rivalId: string,
): Need[] {
  const [next, ...rest] = events as [Upcoming, ...Upcoming[]];
  const scores = teamScores(next.kind);
  const me = find(table, id);
  const others = table
    .filter((r) => r.id !== id && r.id !== rivalId)
    .map((r) => ceiling(r, events, "constructors").points);
  const rival = find(table, rivalId);
  const restMax = ceiling({ ...rival, points: 0 }, rest, "constructors").points;
  return scores.map((theirs) => {
    const bar = Math.max(rival.points + theirs + restMax, ...others);
    const fit = scores.filter((s) => me.points + s > bar);
    return { rival: theirs, need: fit.length ? Math.min(...fit) : null };
  });
}

export type Simulation = {
  final: Standing[];
  decided: { index: number; id: string } | null;
};

export function simulate(
  table: Standing[],
  events: Upcoming[],
  picks: Picks,
  champ: Championship,
): Simulation {
  let current = table;
  let decided: Simulation["decided"] = null;
  events.forEach((e, i) => {
    current = current.map((s) => addResult(s, e.kind, picks[i]?.[s.id] ?? []));
    const rest = events.slice(i + 1);
    const winner = current.find((s) => hasClinched(current, rest, s.id, champ));
    if (!decided && winner) decided = { index: i, id: winner.id };
  });
  return {
    final: [...current].sort((a, b) => (ahead(a, b) ? -1 : ahead(b, a) ? 1 : 0)),
    decided,
  };
}

export const maxGain = (events: Upcoming[], champ: Championship): number =>
  ceiling({ id: "", points: 0, countback: [] }, events, champ).points;
