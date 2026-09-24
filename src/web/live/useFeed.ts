import { useEffect, useState } from "react";
import { merge, type Json } from "../../shared/merge.ts";
import type { Delta, Snapshot } from "../../shared/timing.ts";

export type Feed = Snapshot & { start?: number; beat: number };

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
      setFeed((f) => {
        if (!f) return f;
        const state = { ...f.state } as Record<string, Json>;
        let { t, beat } = f;
        for (const [topic, data, at] of batch) {
          t = at;
          if (topic === "Clock") continue;
          if (topic === "Heartbeat") beat = at;
          state[topic] = merge(state[topic], data as Json);
        }
        return { ...f, state, t, beat };
      });
    });
    return () => source.close();
  }, [url]);
  return feed;
}

export const feedUtc = (f: Feed): number => {
  const utc = Date.parse((f.state.Heartbeat as { Utc?: string } | undefined)?.Utc ?? "");
  return Number.isNaN(utc) ? f.t : utc + (f.t - f.beat);
};
