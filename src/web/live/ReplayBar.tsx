import { useState } from "react";
import { Pause, Play } from "lucide-react";
import type { SessionRef } from "../../shared/timing.ts";
import { Flag } from "../Flag.tsx";
import { Tabs } from "../Tabs.tsx";
import type { Feed } from "./useFeed.ts";

const SPEEDS = [1, 2, 4, 8, 16, 32];
const UNITS = ["time", "laps"] as const;

interface ReplayBarProps {
  session: SessionRef;
  starts: number[];
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

export const ReplayBar = ({
  session,
  starts,
  feed,
  pending,
  playing,
  speed,
  onToggle,
  onSpeed,
  onSeek,
}: ReplayBarProps) => {
  const [drag, setDrag] = useState<number | null>(null);
  const start = feed?.start ?? 0;
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("time");
  const laps = unit === "laps" && starts.length > 1;
  const value = drag ?? pending ?? feed?.t ?? 0;
  const lap = Math.max(
    0,
    starts.findLastIndex((s) => s <= value),
  );
  const toT = (v: number) => (laps ? starts[v]! : v);
  return (
    <div className="bg-surface flex flex-wrap items-center gap-3 rounded-xl p-3 text-sm">
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
        {playing ? (
          <Pause aria-hidden="true" className="size-4" />
        ) : (
          <Play aria-hidden="true" className="size-4" />
        )}
      </button>
      <select
        value={speed}
        onChange={(e) => onSpeed(Number(e.target.value))}
        className="rounded-md bg-zinc-800 px-2 py-1"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
      {starts.length > 1 && (
        <Tabs items={UNITS} value={unit} onChange={setUnit} small />
      )}
      <input
        type="range"
        aria-label={laps ? "Seek to lap" : "Seek to time"}
        min={laps ? 0 : start}
        max={laps ? starts.length - 1 : (feed?.duration ?? 0)}
        step={laps ? 1 : 1000}
        value={laps ? lap : value}
        onChange={(e) => setDrag(toT(Number(e.target.value)))}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerUp={(e) => {
          onSeek(toT(Number(e.currentTarget.value)));
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
        className="min-w-24 flex-1 accent-red-500"
      />
      <span className="tabular font-mono text-zinc-300">
        {laps ? `Lap ${lap + 1}/${starts.length}` : clock(value - start)}
      </span>
    </div>
  );
};
