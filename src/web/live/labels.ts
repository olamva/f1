export type Car = { number: string; x: number; y: number; h: number };
export type Label = { dx: number; dy: number; lead: boolean };

const W = 56;
const DOT = 18;
const DIRECTIONS = [
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
] as const;

type Box = [number, number, number, number];

const overlap = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

const area = (a: Box, b: Box) =>
  Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

const candidates = (h: number) =>
  [1, 2, 3].flatMap((ring) =>
    DIRECTIONS.map(([ux, uy]) => ({
      dx: ux * (DOT + W / 2 + 4) * ring,
      dy: uy * (DOT + h / 2 + 4) * ring,
      lead: ring > 1 || ux !== 0 || uy !== -1,
    })),
  );

export const placeLabels = (cars: Car[]): Record<string, Label> => {
  const taken: Box[] = cars.map(({ x, y }) => [x - DOT, y - DOT, x + DOT, y + DOT]);
  return Object.fromEntries(
    cars.map(({ number, x, y, h }) => {
      const box = ({ dx, dy }: Label): Box => [x + dx - W / 2, y + dy - h / 2, x + dx + W / 2, y + dy + h / 2];
      const options = candidates(h);
      const best =
        options.find((o) => !taken.some((t) => overlap(box(o), t))) ??
        options.reduce((a, b) => {
          const cost = (o: Label) => taken.reduce((sum, t) => sum + area(box(o), t), 0);
          return cost(b) < cost(a) ? b : a;
        });
      taken.push(box(best));
      return [number, best];
    }),
  );
};
