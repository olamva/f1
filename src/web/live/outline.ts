import type { Outline } from "../../shared/timing.ts";

export const nearest = (outline: Outline, x: number, y: number) =>
  outline.x.reduce(
    (best, px, i) =>
      Math.hypot(px - x, outline.y[i]! - y) <
      Math.hypot(outline.x[best]! - x, outline.y[best]! - y)
        ? i
        : best,
    0,
  );

const indexAt = (progress: number[], fraction: number) =>
  Math.max(
    0,
    progress.findIndex(
      (t) => t >= progress[0]! + fraction * (progress.at(-1)! - progress[0]!),
    ),
  );

export const markers = (
  outline: Outline,
  project: (x: number, y: number) => [number, number],
  fractions: number[],
) => {
  const points = outline.x.map((x, i) => project(x, outline.y[i]!));
  const n = points.length;
  const at = (i: number) => points[(i + n) % n]!;
  const normal = (i: number): [number, number] => {
    const [ax, ay] = at(i - 3);
    const [bx, by] = at(i + 3);
    const length = Math.hypot(bx - ax, by - ay) || 1;
    return [(ay - by) / length, (bx - ax) / length];
  };
  const across = (
    i: number,
    offset: number,
  ): [number, number, number, number] => {
    const [nx, ny] = normal(i);
    return [...at(i), nx * offset, ny * offset];
  };
  const placed: [number, number, number][] = [];
  const clearance = (x: number, y: number, width: number) =>
    Math.min(
      ...points.map(
        ([px, py]) =>
          Math.max(Math.abs(px - x) - width / 2, Math.abs(py - y) - 11) - 9,
      ),
      ...placed.map(([px, py, w]) =>
        Math.max(Math.abs(px - x) - (width + w) / 2, Math.abs(py - y) - 22),
      ),
    );
  const beside = (i: number, width: number, shifts = [0]): [number, number] => {
    const [x, y] = shifts
      .flatMap((shift) => {
        const [x, y] = at(i + shift);
        const [nx, ny] = normal(i + shift);
        const d = 16 + (Math.abs(nx) * width) / 2 + Math.abs(ny) * 11;
        return [d, -d].map((k) => {
          const p: [number, number] = [x + nx * k, y + ny * k];
          return { p, score: clearance(...p, width) - Math.abs(shift) / n };
        });
      })
      .reduce((best, c) => (c.score > best.score ? c : best)).p;
    placed.push([x, y, width]);
    return [x, y];
  };
  let distance = 0;
  const progress = outline.time.length
    ? outline.time
    : points.map(([x, y], i) =>
        i ? (distance += Math.hypot(x - at(i - 1)[0], y - at(i - 1)[1])) : 0,
      );
  const lines = outline.sectors.length
    ? outline.sectors.map((s) => nearest(outline, s.x, s.y))
    : [0, ...fractions.map((f) => indexAt(progress, f))];
  return {
    finish: across(lines[0]!, 20),
    splits: lines.slice(1).map((i) => across(i, 16)),
    corners: outline.corners.map((c) => ({
      number: c.number,
      at: beside(nearest(outline, c.x, c.y), 11 * String(c.number).length),
    })),
    labels:
      lines.length > 1
        ? lines.map((i, k) =>
            beside(
              i + Math.round((((lines[k + 1] ?? lines[0]!) - i + n) % n) / 2),
              90,
              [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) =>
                Math.round((k * n) / 60),
              ),
            ),
          )
        : [],
    marshal: outline.marshalSectors.map((s, k, all) => {
      const from = nearest(outline, s.x, s.y);
      const next = all[(k + 1) % all.length]!;
      const length = (nearest(outline, next.x, next.y) - from + n) % n;
      return {
        number: s.number,
        path: Array.from({ length: length + 1 }, (_, j) =>
          at(from + j)
            .map(Math.round)
            .join(","),
        ).join(" "),
        at: beside(
          from + Math.round(length / 2),
          46,
          [-1, 0, 1].map((j) => Math.round((j * length) / 4)),
        ),
      };
    }),
  };
};
