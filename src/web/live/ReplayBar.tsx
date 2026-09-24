import { useState } from "react";
import type { SessionRef } from "../../shared/timing.ts";
import type { Feed } from "./useFeed.ts";

const SPEEDS = [1, 2, 4, 8, 16, 32];

interface ReplayBarProps {
  sessions: SessionRef[];
  path: string | null;
  onPath: (path: string) => void;
  feed: Feed | null;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onSpeed: (speed: number) => void;
  onSeek: (t: number) => void;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const ReplayBar = ({ sessions, path, onPath, feed, playing, speed, onToggle, onSpeed, onSeek }: ReplayBarProps) => {
  const [drag, setDrag] = useState<number | null>(null);
  const start = feed?.start ?? 0;
  const value = drag ?? feed?.t ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3 text-sm">
      <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs font-semibold">REPLAY</span>
      <select
        value={path ?? ""}
        onChange={(e) => onPath(e.target.value)}
        className="rounded-md bg-zinc-800 px-2 py-1"
      >
        {sessions.map((s) => (
          <option key={s.path} value={s.path}>
            {s.meeting} · {s.name}
          </option>
        ))}
      </select>
      <button onClick={onToggle} className="rounded-md bg-zinc-100 px-3 py-1 font-semibold text-zinc-900">
        {playing ? "Pause" : "Play"}
      </button>
      <select value={speed} onChange={(e) => onSpeed(Number(e.target.value))} className="rounded-md bg-zinc-800 px-2 py-1">
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
      <input
        type="range"
        min={0}
        max={feed?.duration ?? 0}
        step={1000}
        value={value}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => {
          if (drag !== null) onSeek(drag);
          setDrag(null);
        }}
        className="min-w-48 flex-1 accent-red-500"
      />
      <span className="tabular font-mono text-zinc-300">{clock(value - start)}</span>
    </div>
  );
};
