import {
  lapSeconds,
  type LapTrace,
  type Point,
  type Telemetry,
} from "../shared/timing.ts";

const KEEP_MS = 5 * 60_000;
const MARGIN_MS = 3_000;

type Pending = {
  number: string;
  lap: number;
  time: string;
  from: number;
  to: number;
};

export class Traces {
  laps: Record<string, Record<number, LapTrace>> = {};
  private speeds: Record<string, [number, number][]> = {};
  private pending: Pending[] = [];

  best(number: string, lap: number, time: string, end: number) {
    const seconds = lapSeconds(time);
    if (seconds)
      this.pending.push({
        number,
        lap,
        time,
        from: end - seconds * 1000 - MARGIN_MS,
        to: end + MARGIN_MS,
      });
  }

  see(
    t: number,
    cars: Record<string, Telemetry>,
    track: Record<string, number[]>,
  ) {
    for (const [n, c] of Object.entries(cars)) {
      const speeds = (this.speeds[n] ??= []);
      speeds.push([t, c[0]]);
      if (speeds[0]![0] < t - 2 * KEEP_MS)
        speeds.splice(
          0,
          speeds.findIndex(([at]) => at >= t - KEEP_MS),
        );
    }
    this.flush(t, track);
  }

  flush(now: number, track: Record<string, number[]>) {
    this.pending = this.pending.filter((p) => {
      if (now < p.to) return true;
      const points = track[p.number] ?? [];
      const pos: Point[] = [];
      for (let i = 0; i < points.length; i += 3)
        if (points[i]! >= p.from && points[i]! <= p.to)
          pos.push([points[i]! - p.from, points[i + 1]!, points[i + 2]!]);
      (this.laps[p.number] ??= {})[p.lap] = {
        lap: p.lap,
        time: p.time,
        car: (this.speeds[p.number] ?? [])
          .filter(([t]) => t >= p.from && t <= p.to)
          .map(([t, speed]) => [t - p.from, speed]),
        pos,
      };
      return false;
    });
  }
}
