import { useEffect, useRef, useState } from "react";
import { merge, type Json } from "../../shared/merge.ts";
import type { Delta, Snapshot } from "../../shared/timing.ts";

export type PositionTrail = {
  from: Record<string, [number, number]>;
  samples: Record<string, [number, number]>[];
};

export type Feed = Snapshot & {
  start?: number;
  beat: number;
  positionTrail?: PositionTrail;
  src?: string;
};

export const applyDelta = (f: Feed, batch: Delta[]): Feed => {
  const state = { ...f.state } as Record<string, Json>;
  let { t, beat } = f;
  const samples: PositionTrail["samples"] = [];
  for (const [topic, data, at] of batch) {
    t = at;
    if (topic === "Clock") continue;
    if (topic === "Heartbeat") beat = at;
    if (topic === "Position")
      samples.push(data as Record<string, [number, number]>);
    state[topic] = merge(state[topic], data as Json);
  }
  const positionTrail = samples.length
    ? { from: (f.state.Position as PositionTrail["from"]) ?? {}, samples }
    : undefined;
  return { ...f, state, t, beat, positionTrail };
};

type Update = (f: Feed | null) => Feed | null;

const HISTORY = 600_000;

export const buffer = () => {
  const queue: [number, Update][] = [];
  const past: [number, Update, Feed | null][] = [];
  return {
    push: (at: number, u: Update) => void queue.push([at, u]),
    flush: (cut: number) => {
      const top = past.at(-1);
      while (past.length > 1 && past.at(-1)![0] > cut) {
        const [at, u] = past.pop()!;
        queue.unshift([at, u]);
      }
      while (queue.length && queue[0][0] <= cut) {
        const [at, u] = queue.shift()!;
        past.push([at, u, u(past.at(-1)?.[2] ?? null)]);
      }
      const n = past.findIndex(([at]) => at >= cut - HISTORY);
      past.splice(0, (n < 0 ? past.length : n) - 1);
      return past.at(-1) === top ? undefined : (past.at(-1)?.[2] ?? null);
    },
  };
};

export function useFeed(url: string | null, delay = 0): Feed | null {
  const [feed, setFeed] = useState<Feed | null>(null);
  const lag = useRef(delay);
  lag.current = delay;
  useEffect(() => {
    if (!url) return;
    const b = buffer();
    const flush = () => {
      const f = b.flush(Date.now() - lag.current);
      if (f !== undefined) setFeed(f);
    };
    const push = (u: Update) => {
      b.push(Date.now(), u);
      flush();
    };
    const timer = setInterval(flush, 200);
    const source = new EventSource(url);
    source.addEventListener("snapshot", (m) => {
      const snap = JSON.parse(m.data) as Feed;
      push(() => ({ ...snap, beat: snap.t, src: url }));
    });
    source.addEventListener("delta", (m) => {
      const batch = JSON.parse(m.data) as Delta[];
      push((f) => (f ? applyDelta(f, batch) : f));
    });
    return () => {
      source.close();
      clearInterval(timer);
    };
  }, [url]);
  return feed;
}

export const feedUtc = (f: Feed): number => {
  const utc = Date.parse(
    (f.state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "",
  );
  return Number.isNaN(utc) ? f.t : utc + (f.t - f.beat);
};
