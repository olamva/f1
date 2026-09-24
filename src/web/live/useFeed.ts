import { useEffect, useState } from "react";
import { merge, type Json } from "../../shared/merge.ts";
import type { Delta, Snapshot } from "../../shared/timing.ts";

export type PositionTrail = {
  from: Record<string, [number, number]>;
  samples: Record<string, [number, number]>[];
};

export type Feed = Snapshot & { start?: number; beat: number; positionTrail?: PositionTrail };

export const applyDelta = (f: Feed, batch: Delta[]): Feed => {
  const state = { ...f.state } as Record<string, Json>;
  let { t, beat } = f;
  const samples: PositionTrail["samples"] = [];
  for (const [topic, data, at] of batch) {
    t = at;
    if (topic === "Clock") continue;
    if (topic === "Heartbeat") beat = at;
    if (topic === "Position") samples.push(data as Record<string, [number, number]>);
    state[topic] = merge(state[topic], data as Json);
  }
  const positionTrail = samples.length
    ? { from: (f.state.Position as PositionTrail["from"]) ?? {}, samples }
    : undefined;
  return { ...f, state, t, beat, positionTrail };
};

export function useFeed(url: string | null): Feed | null {
  const [feed, setFeed] = useState<Feed | null>(null);
  useEffect(() => {
    if (!url) return;
    const source = new EventSource(url);
    source.addEventListener("snapshot", (m) => {
      const snap = JSON.parse(m.data) as Feed;
      setFeed({ ...snap, beat: snap.t });
    });
    source.addEventListener("delta", (m) => {
      const batch = JSON.parse(m.data) as Delta[];
      setFeed((f) => (f ? applyDelta(f, batch) : f));
    });
    return () => source.close();
  }, [url]);
  return feed;
}

export const feedUtc = (f: Feed): number => {
  const utc = Date.parse((f.state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "");
  return Number.isNaN(utc) ? f.t : utc + (f.t - f.beat);
};
