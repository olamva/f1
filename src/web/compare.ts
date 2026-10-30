import {
  lapSeconds,
  type LapRow,
  type LapTrace,
  type Outline,
} from "../shared/timing.ts";

export const STEP = 10;
export const MINI_SECTORS = 25;
const UNIT = 10;
const TOLERANCE = 0.05;

export type Course = {
  x: number[];
  y: number[];
  at: number[];
  length: number;
  finish: number;
};

export type Trace = { speed: number[]; time: number[] };

const locate = ({ x, y, at }: Course, px: number, py: number): number => {
  let best = Infinity;
  let distance = 0;
  for (let i = 0; i < x.length; i++) {
    const j = (i + 1) % x.length;
    const dx = x[j]! - x[i]!;
    const dy = y[j]! - y[i]!;
    const k = Math.min(
      1,
      Math.max(
        0,
        ((px - x[i]!) * dx + (py - y[i]!) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    const gap = Math.hypot(x[i]! + k * dx - px, y[i]! + k * dy - py);
    if (gap < best) {
      best = gap;
      distance = at[i]! + k * (at[i + 1]! - at[i]!);
    }
  }
  return distance;
};

export const course = (outline: Outline): Course => {
  const { x, y } = outline;
  const at = [0];
  for (let i = 1; i <= x.length; i++)
    at.push(
      at[i - 1]! +
        Math.hypot(x[i % x.length]! - x[i - 1]!, y[i % x.length]! - y[i - 1]!) /
          UNIT,
    );
  const c = { x, y, at, length: at.at(-1)!, finish: 0 };
  const line = outline.sectors[0];
  return line ? { ...c, finish: locate(c, line.x, line.y) } : c;
};

export const pointAt = (c: Course, d: number): [number, number] => {
  const s = (((c.finish + d) % c.length) + c.length) % c.length;
  const i = Math.min(
    c.x.length - 1,
    c.at.findLastIndex((a) => a <= s),
  );
  const j = (i + 1) % c.x.length;
  const k = (s - c.at[i]!) / (c.at[i + 1]! - c.at[i]!);
  return [c.x[i]! + k * (c.x[j]! - c.x[i]!), c.y[i]! + k * (c.y[j]! - c.y[i]!)];
};

export const trace = (c: Course, lap: LapTrace): Trace | null => {
  const ms = lapSeconds(lap.time)! * 1000;
  const half = c.length / 2;
  const fixes = lap.pos
    .filter(([, x, y]) => x || y)
    .map(([t, x, y]): [number, number] => [
      t,
      ((locate(c, x, y) - c.finish + c.length + half) % c.length) - half,
    ]);
  const crossings = fixes.slice(1).flatMap(([t, d], i) => {
    const [t0, d0] = fixes[i]!;
    return d0 < 0 && d >= 0 && d - d0 < half
      ? [t0 + ((t - t0) * -d0) / (d - d0)]
      : [];
  });
  const { car } = lap;
  const start = crossings[0];
  const end = crossings.at(-1);
  if (
    start === undefined ||
    end === undefined ||
    Math.abs(end - start - ms) > ms * TOLERANCE ||
    !((car[0]?.[0] ?? end) < start && (car.at(-1)?.[0] ?? start) > end)
  )
    return null;
  const along = [0];
  for (let j = 1; j < car.length; j++)
    along.push(
      along[j - 1]! +
        ((car[j]![1] + car[j - 1]![1]) * (car[j]![0] - car[j - 1]![0])) / 7200,
    );
  const at = (t: number) => {
    const j = car.findIndex(([time]) => time >= t);
    const k = (t - car[j - 1]![0]) / (car[j]![0] - car[j - 1]![0]);
    return along[j - 1]! + k * (along[j]! - along[j - 1]!);
  };
  const [from, to] = [at(start), at(end)];
  const d = along.map((v) => ((v - from) / (to - from)) * c.length);
  const out: Trace = { speed: [], time: [] };
  for (let g = 0, j = 0; g <= c.length; g += STEP) {
    while (j < d.length - 2 && d[j + 1]! < g) j++;
    const k = (g - d[j]!) / (d[j + 1]! - d[j]! || 1);
    const t = car[j]![0] + k * (car[j + 1]![0] - car[j]![0]);
    out.speed.push(Math.round(car[j]![1] + k * (car[j + 1]![1] - car[j]![1])));
    out.time.push(((t - start) / (end - start)) * (ms / 1000));
  }
  return out;
};

export const miniSector = (c: Course, k: number): [number, number][] => {
  const from = (k * c.length) / MINI_SECTORS;
  const to = ((k + 1) * c.length) / MINI_SECTORS;
  return Array.from({ length: Math.ceil((to - from) / STEP) + 1 }, (_, i) =>
    pointAt(c, Math.min(to, from + i * STEP)),
  );
};

export const miniSectors = (a: Trace, b: Trace): number[] => {
  const n = Math.min(a.time.length, b.time.length) - 1;
  return Array.from({ length: MINI_SECTORS }, (_, k) => {
    const i = Math.round((k * n) / MINI_SECTORS);
    const j = Math.round(((k + 1) * n) / MINI_SECTORS);
    return a.time[j]! - a.time[i]! - (b.time[j]! - b.time[i]!);
  });
};

export const fastestLap = (
  laps: LapRow[],
  deleted: Set<number>,
  until: number,
): LapRow | undefined =>
  laps
    .filter((l) => l.t <= until && lapSeconds(l.time) && !deleted.has(l.lap))
    .reduce<LapRow | undefined>(
      (best, l) =>
        best && lapSeconds(best.time)! <= lapSeconds(l.time)! ? best : l,
      undefined,
    );
