import { useState } from "react";
import { Pause, Play, X } from "lucide-react";
import type { SessionRef } from "../../shared/timing.ts";
import { Flag } from "../Flag.tsx";
import type { Feed } from "./useFeed.ts";

const SPEEDS = [1, 2, 4, 8, 16, 32];

interface ReplayBarProps {
  session: SessionRef;
  onClose: () => void;
  feed: Feed | null;
  pending: number | null;
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

export const ReplayBar = ({ session, onClose, feed, pending, playing, speed, onToggle, onSpeed, onSeek }: ReplayBarProps) => {
  const [drag, setDrag] = useState<number | null>(null);
  const start = feed?.start ?? 0;
  const value = drag ?? pending ?? feed?.t ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3 text-sm">
      <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs font-semibold">REPLAY</span>
      <span className="font-semibold">
        <Flag country={session.country} />
        {session.meeting} · {session.name}
      </span>
      <button
        onClick={onToggle}
        aria-label={playing ? "Pause replay" : "Play replay"}
        title={playing ? "Pause replay" : "Play replay"}
        className="grid size-8 cursor-pointer place-items-center rounded-md bg-zinc-100 text-zinc-900"
      >
        {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
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
        min={start}
        max={feed?.duration ?? 0}
        step={1000}
        value={value}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerUp={(e) => {
          onSeek(Number(e.currentTarget.value));
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
        onKeyUp={() => {
          if (drag !== null) onSeek(drag);
          setDrag(null);
        }}
        onBlur={() => {
          if (drag !== null) onSeek(drag);
          setDrag(null);
        }}
        className="min-w-48 flex-1 accent-red-500"
      />
      <span className="tabular font-mono text-zinc-300">{clock(value - start)}</span>
      <button
        onClick={onClose}
        aria-label="Close replay"
        title="Close replay"
        className="grid size-8 cursor-pointer place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
};
