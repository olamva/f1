import circuits from "./circuits.json" with { type: "json" };
import type { Event, State } from "./timing.ts";

type Marks = Record<string, boolean>;
type Line = { x: number; y: number; dx: number; dy: number };

const GAP_MS = 1000;
const REACH = 300;
const ON = /^OVERTAKE ENABLED/;
const OFF =
  /^(?:OVERTAKE DISABLED|RED FLAG|CHEQUERED FLAG)|\b(?:VSC|SAFETY CAR) DEPLOYED/;

const lineFor = (info: any): Line | null => {
  const date = String(info?.StartDate ?? "").slice(0, 10);
  const c = circuits.find(
    (c) =>
      c.key === info?.Meeting?.Circuit?.Key && c.from <= date && date <= c.to,
  );
  const d = c?.detection;
  if (!d) return null;
  const n = c.x.length;
  const away = (i: number) => Math.hypot(c.x[i]! - d.x, c.y[i]! - d.y);
  const i = c.x.reduce((best, _, k) => (away(k) < away(best) ? k : best), 0);
  const dx = c.x[(i + 1) % n]! - c.x[(i + n - 1) % n]!;
  const dy = c.y[(i + 1) % n]! - c.y[(i + n - 1) % n]!;
  const length = Math.hypot(dx, dy);
  return { ...d, dx: dx / length, dy: dy / length };
};

export class Overtake {
  private line: Line | null = null;
  private on = false;
  private sides: Record<string, [t: number, along: number, across: number]> =
    {};
  private passed: Record<string, number> = {};

  see(e: Event, state: State): Marks | null {
    if (e.topic === "SessionInfo") this.line = lineFor(state.SessionInfo);
    if (e.topic === "RaceControlMessages")
      return this.messages(e.data, state.OvertakeMode as Marks | undefined);
    if (e.topic === "Position" && this.line)
      return this.positions(
        e.t,
        e.data as Record<string, [number, number]>,
        this.line,
      );
    return null;
  }

  private messages(data: any, marks: Marks = {}): Marks | null {
    for (const m of Object.values<any>(data?.Messages ?? {}))
      if (ON.test(m.Message)) this.on = true;
      else if (OFF.test(m.Message)) this.on = false;
    const cleared = Object.keys(marks).filter((n) => marks[n]);
    return this.on || !cleared.length
      ? null
      : Object.fromEntries(cleared.map((n) => [n, false]));
  }

  private positions(
    t: number,
    data: Record<string, [number, number]>,
    { x, y, dx, dy }: Line,
  ): Marks | null {
    const crossed: [string, number][] = [];
    for (const [n, [px, py]] of Object.entries(data)) {
      if (!px && !py) continue;
      const along = (px - x) * dx + (py - y) * dy;
      const across = (py - y) * dx - (px - x) * dy;
      const before = this.sides[n];
      this.sides[n] = [t, along, across];
      if (!before || before[1] >= 0 || along < 0) continue;
      const k = before[1] / (before[1] - along);
      if (Math.abs(before[2] + (across - before[2]) * k) > REACH) continue;
      crossed.push([n, before[0] + (t - before[0]) * k]);
    }
    if (!crossed.length) return null;
    const marks: Marks = {};
    for (const [n, at] of crossed.sort((a, b) => a[1] - b[1])) {
      const ahead = Math.max(
        ...Object.entries(this.passed).flatMap(([m, p]) => (m === n ? [] : p)),
      );
      marks[n] = this.on && at - ahead <= GAP_MS;
      this.passed[n] = at;
    }
    return marks;
  }
}
