import { useEffect, useRef, useState, type RefObject } from "react";
import { merge, type Json } from "../../shared/merge.ts";
import type { Delta, Snapshot } from "../../shared/timing.ts";
import type { ClockState, Latest } from "./sync.ts";

type Point = [number, number];

export type PositionTrail = [number, Record<string, Point>][];

const known = (p?: Point) => (p && (p[0] || p[1]) ? p : undefined);

export const positionsAt = (
  trail: PositionTrail,
  clock: number,
): Record<string, Point> => {
  const i = Math.max(
    0,
    trail.findLastIndex(([t]) => t <= clock),
  );
  const [t0, a] = trail[i]!;
  const [t1, b] = trail[i + 1] ?? trail[i]!;
  const k = Math.min(1, Math.max(0, (clock - t0) / (t1 - t0 || 1)));
  return Object.fromEntries(
    Object.keys(b).flatMap((n) => {
      const p = known(a[n]) ?? known(b[n]);
      const q = known(b[n]) ?? p;
      return p && q
        ? [[n, [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]]]
        : [];
    }),
  );
};

export type Feed = Snapshot & {
  beat: number;
  positionTrail?: PositionTrail;
  src?: string;
};

export const applyDelta = (f: Feed, batch: Delta[]): Feed => {
  const state = { ...f.state } as Record<string, Json>;
  let { t, beat } = f;
  const positionTrail: PositionTrail = [];
  for (const [topic, data, at] of batch) {
    t = at;
    if (topic === "Clock") continue;
    if (topic === "Heartbeat") beat = at;
    if (topic === "Position")
      positionTrail.push([at, data as Record<string, Point>]);
    state[topic] = merge(state[topic], data as Json);
  }
  return { ...f, state, t, beat, positionTrail };
};

type Update = (f: Feed | null) => Feed | null;

export const buffer = () => {
  const queue: [number, Update][] = [];
  let feed: Feed | null = null;
  return {
    push: (at: number, u: Update) =>
      void queue.splice(queue.findLastIndex(([t]) => t <= at) + 1, 0, [at, u]),
    flush: (cut: number) => {
      if (!(queue.length && queue[0][0] <= cut)) return undefined;
      while (queue.length && queue[0][0] <= cut) feed = queue.shift()![1](feed);
      return feed;
    },
  };
};

export function useFeed(
  url: string | null,
  delay = 0,
): [Feed | null, number | null, RefObject<Latest>] {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [due, setDue] = useState<number | null>(null);
  const latest = useRef<Latest>({ lapAt: null, clock: null });
  const lag = useRef(delay);
  lag.current = delay;
  useEffect(() => {
    if (!url) return;
    latest.current = { lapAt: null, clock: null };
    const b = buffer();
    const flush = () => {
      const f = b.flush(Date.now() - lag.current);
      if (f !== undefined) setFeed(f);
    };
    let skew: number | null = null;
    const timer = setInterval(flush, 200);
    const source = new EventSource(url);
    source.addEventListener("snapshot", (m) => {
      const snap = JSON.parse(m.data) as Feed;
      skew = snap.now === undefined ? null : Date.now() - snap.now;
      const at = skew === null ? Date.now() : snap.t + skew;
      setDue(at + lag.current);
      latest.current.clock =
        (snap.state.ExtrapolatedClock as ClockState | undefined) ?? null;
      b.push(at, () => ({ ...snap, beat: snap.t, src: url }));
      flush();
    });
    source.addEventListener("delta", (m) => {
      const batch = JSON.parse(m.data) as Delta[];
      for (const [topic, data, at] of batch) {
        if (topic === "LapCount" && (data as any)?.CurrentLap !== undefined)
          latest.current.lapAt = skew === null ? Date.now() : at + skew;
        if (topic === "ExtrapolatedClock")
          latest.current.clock = merge(
            (latest.current.clock ?? undefined) as Json | undefined,
            data as Json,
          ) as ClockState;
      }
      if (skew === null)
        b.push(Date.now(), (f) => (f ? applyDelta(f, batch) : f));
      else
        for (const d of batch)
          b.push(d[2] + skew, (f) => (f ? applyDelta(f, [d]) : f));
      flush();
    });
    return () => {
      source.close();
      clearInterval(timer);
    };
  }, [url]);
  return [feed, due, latest];
}

export const feedUtc = (f: Feed): number => {
  const utc = Date.parse(
    (f.state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "",
  );
  return Number.isNaN(utc) ? f.t : utc + (f.t - f.beat);
};
