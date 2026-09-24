import {
  addResult,
  beatsOnCountback,
  type Standing,
  type Upcoming,
} from "../../shared/clinch.ts";
import type { Classified, QualiResult, Season } from "../../shared/season.ts";
import { lapSeconds } from "../../shared/timing.ts";
import { teamColor } from "../../shared/teams.ts";

export type Who = {
  id: string;
  code: string;
  name: string;
  team: string;
  color: string;
};

export const drivers = (s: Season): Map<string, Who> =>
  new Map(
    s.drivers.map((d) => [
      d.id,
      {
        id: d.id,
        code: d.code,
        name: d.name,
        team: d.team,
        color: teamColor(d.team),
      },
    ]),
  );

export const teams = (s: Season): Map<string, Who> =>
  new Map(
    s.teams.map((t) => [
      t.id,
      {
        id: t.id,
        code: t.name,
        name: t.name,
        team: t.id,
        color: teamColor(t.id),
      },
    ]),
  );

type Key = (r: Classified) => string;
const byDriver: Key = (r) => r.driver;
const byTeam: Key = (r) => r.team;

const rank = (a: Standing, b: Standing) =>
  b.points - a.points ||
  (beatsOnCountback(a.countback, b.countback)
    ? -1
    : beatsOnCountback(b.countback, a.countback)
      ? 1
      : 0);

function tables(s: Season, key: Key, ids: string[]): Map<number, Standing[]> {
  let table = new Map(
    ids.map((id) => [id, { id, points: 0, countback: [] } as Standing]),
  );
  const out = new Map<number, Standing[]>();
  const rounds = [
    ...new Set([...s.races, ...s.sprints].map((r) => r.round)),
  ].sort((a, b) => a - b);
  for (const round of rounds) {
    const apply = (kind: "race" | "sprint", rows: Classified[] = []) => {
      for (const r of rows) {
        const id = key(r);
        const cur = table.get(id) ?? { id, points: 0, countback: [] };
        const next = addResult(cur, kind, r.position ? [r.position] : []);
        table.set(id, { ...next, points: cur.points + r.points });
      }
    };
    table = new Map(table);
    apply("sprint", s.sprints.find((x) => x.round === round)?.results);
    apply("race", s.races.find((x) => x.round === round)?.results);
    out.set(round, [...table.values()].sort(rank));
  }
  return out;
}

export const driverTables = (s: Season) =>
  tables(
    s,
    byDriver,
    s.drivers.map((d) => d.id),
  );
export const teamTables = (s: Season) =>
  tables(
    s,
    byTeam,
    s.teams.map((t) => t.id),
  );

export const latest = (t: Map<number, Standing[]>): Standing[] =>
  [...t.values()].at(-1) ?? [];

export function remaining(s: Season): Upcoming[] {
  const raced = new Set(s.races.map((r) => r.round));
  const sprinted = new Set(s.sprints.map((r) => r.round));
  return s.rounds
    .filter((r) => !raced.has(r.round))
    .flatMap((r) => [
      ...(r.sessions.sprint && !sprinted.has(r.round)
        ? [
            {
              round: r.round,
              name: `${r.name} Sprint`,
              kind: "sprint" as const,
              country: r.country,
            },
          ]
        : []),
      { round: r.round, name: r.name, kind: "race" as const, country: r.country },
    ]);
}

export function gains(
  s: Season,
): { id: string; total: number; races: number }[] {
  const out = new Map<string, { id: string; total: number; races: number }>();
  for (const r of s.races.flatMap((x) => x.results)) {
    if (!r.position || !r.grid) continue;
    const g = out.get(r.driver) ?? { id: r.driver, total: 0, races: 0 };
    out.set(r.driver, {
      id: r.driver,
      total: g.total + r.grid - r.position,
      races: g.races + 1,
    });
  }
  return [...out.values()].sort((a, b) => b.total - a.total);
}

const best = (q: QualiResult, depth: "q3" | "q2" | "q1") =>
  lapSeconds(q[depth] ?? "");

function qualiGap(a: QualiResult, b: QualiResult): number | null {
  for (const depth of ["q3", "q2", "q1"] as const) {
    const [x, y] = [best(a, depth), best(b, depth)];
    if (x !== null && y !== null) return x - y;
  }
  return null;
}

export type Duel = {
  team: string;
  a: string;
  b: string;
  quali: [number, number];
  race: [number, number];
  sprint: [number, number];
  racePoints: [number, number];
  sprintPoints: [number, number];
  gap: number | null;
};

const median = (v: number[]) => {
  const s = [...v].sort((x, y) => x - y);
  return s.length
    ? (s[Math.floor((s.length - 1) / 2)]! + s[Math.ceil((s.length - 1) / 2)]!) /
        2
    : null;
};

const pairOf = (s: Season, team: string): [string, string] | null => {
  const count = new Map<string, number>();
  for (const r of [...s.races, ...s.sprints]
    .flatMap((x) => x.results)
    .filter((r) => r.team === team))
    count.set(r.driver, (count.get(r.driver) ?? 0) + 1);
  const top = [...count].sort((x, y) => y[1] - x[1]).map((x) => x[0]);
  return top.length >= 2 ? [top[0]!, top[1]!] : null;
};

function duel(s: Season, team: string, a: string, b: string): Duel {
  const d: Duel = {
    team,
    a,
    b,
    quali: [0, 0],
    race: [0, 0],
    sprint: [0, 0],
    racePoints: [0, 0],
    sprintPoints: [0, 0],
    gap: null,
  };
  const gaps: number[] = [];
  for (const q of s.qualifying) {
    const [x, y] = [
      q.results.find((r) => r.driver === a),
      q.results.find((r) => r.driver === b),
    ];
    if (!x || !y) continue;
    d.quali[x.position < y.position ? 0 : 1]++;
    const g = qualiGap(x, y);
    if (g !== null && Math.abs(g) < 3) gaps.push(g);
  }
  for (const [events, results, points] of [
    [s.races, d.race, d.racePoints],
    [s.sprints, d.sprint, d.sprintPoints],
  ] as const) {
    for (const r of events) {
      const [x, y] = [
        r.results.find((e) => e.driver === a),
        r.results.find((e) => e.driver === b),
      ];
      points[0] += x?.team === team ? x.points : 0;
      points[1] += y?.team === team ? y.points : 0;
      if (x?.position && y?.position)
        results[x.position < y.position ? 0 : 1]++;
    }
  }
  d.gap = median(gaps);
  return d;
}

export const duels = (s: Season): Duel[] =>
  s.teams.flatMap((t) => {
    const p = pairOf(s, t.id);
    return p ? [duel(s, t.id, ...p)] : [];
  });

export type SeasonRecord = {
  id: string;
  wins: number;
  poles: number;
  podiums: number;
  dnfs: number;
  pointsStreak: number;
  bestPointsStreak: number;
  bestPodiumStreak: number;
  sprintStarts: number;
  sprintWins: number;
  sprintPodiums: number;
  sprintPoints: number;
};

const streaks = (hits: boolean[]) => {
  let run = 0;
  let top = 0;
  for (const h of hits) {
    run = h ? run + 1 : 0;
    top = Math.max(top, run);
  }
  return { current: run, best: top };
};

export function seasonRecords(s: Season): SeasonRecord[] {
  return s.drivers.map((d) => {
    const mine = s.races
      .map((r) => r.results.find((x) => x.driver === d.id))
      .filter((x) => x !== undefined);
    const sprint = s.sprints
      .map((r) => r.results.find((x) => x.driver === d.id))
      .filter((x) => x !== undefined);
    const points = streaks(mine.map((r) => r.points > 0));
    return {
      id: d.id,
      wins: mine.filter((r) => r.position === 1).length,
      poles: s.qualifying.filter(
        (q) => q.results.find((x) => x.position === 1)?.driver === d.id,
      ).length,
      podiums: mine.filter((r) => r.position !== null && r.position <= 3)
        .length,
      dnfs: mine.filter((r) => r.position === null).length,
      pointsStreak: points.current,
      bestPointsStreak: points.best,
      bestPodiumStreak: streaks(
        mine.map((r) => r.position !== null && r.position <= 3),
      ).best,
      sprintStarts: sprint.length,
      sprintWins: sprint.filter((r) => r.position === 1).length,
      sprintPodiums: sprint.filter(
        (r) => r.position !== null && r.position <= 3,
      ).length,
      sprintPoints: sprint.reduce((sum, r) => sum + r.points, 0),
    };
  });
}
