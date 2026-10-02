import { useState, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { Tabs } from "../Tabs.tsx";
import { StealthInput } from "./StealthInput.tsx";
import { lapTime } from "./view.ts";

const SPEEDS = [1, 2, 4, 8, 16, 32];
const UNITS = ["time", "laps"] as const;

interface ReplayBarProps {
  race: boolean;
  starts: number[];
  start: number;
  end: number;
  at: number;
  playing: boolean;
  speed?: number;
  onToggle: () => void;
  onSpeed?: (speed: number) => void;
  onSeek: (t: number) => void;
  children?: ReactNode;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const ReplayBar = ({
  race,
  starts,
  start,
  end,
  at,
  playing,
  speed,
  onToggle,
  onSpeed,
  onSeek,
  children,
}: ReplayBarProps) => {
  const [drag, setDrag] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("time");
  const laps = unit === "laps" && starts.length > 1;
  const value = drag ?? at;
  const lap = Math.max(
    0,
    starts.findLastIndex((s) => s <= value),
  );
  const toT = (v: number) => (laps ? starts[v]! : v);
  const min = laps ? 0 : start;
  const max = laps ? starts.length - 1 : end;
  const position = laps ? lap : value;
  const progress = Math.max(
    0,
    Math.min(1, (position - min) / Math.max(1, max - min)),
  );
  const readout = laps
    ? `Lap ${lap + 1}/${starts.length}`
    : clock(value - start);
  const cancel = () => {
    setHeld(false);
    setDrag(null);
  };
  return (
    <div className="glass-panel flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl p-3 text-sm">
      <button
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
        title={playing ? "Pause" : "Play"}
        className="glass-control grid size-9 cursor-pointer place-items-center"
      >
        {playing ? (
          <Pause aria-hidden="true" className="size-4" />
        ) : (
          <Play aria-hidden="true" className="size-4" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-3 sm:order-1">
        <div
          className="glass-seek relative min-w-0 flex-1"
          data-held={held}
          data-disabled={max <= min}
          style={{ "--progress": progress } as CSSProperties}
        >
          <span aria-hidden="true" className="glass-seek-track" />
          <span aria-hidden="true" className="glass-seek-thumb" />
          <input
            type="range"
            aria-label={laps ? "Seek to lap" : "Seek to time"}
            aria-valuetext={readout}
            min={min}
            max={max}
            disabled={max <= min}
            step={laps ? 1 : 1000}
            value={position}
            onChange={(e) => setDrag(toT(Number(e.target.value)))}
            onPointerDown={(e) => {
              if (!e.isPrimary || e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setHeld(true);
              setDrag(toT(Number(e.currentTarget.value)));
            }}
            onPointerUp={(e) => {
              if (!held) return;
              onSeek(toT(Number(e.currentTarget.value)));
              cancel();
            }}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onKeyUp={() => {
              if (drag !== null) onSeek(drag);
              setDrag(null);
            }}
            onBlur={() => {
              if (drag !== null) onSeek(drag);
              cancel();
            }}
            className="glass-seek-input"
          />
        </div>
        <span className="tabular font-mono text-zinc-300">
          {laps ? (
            <>
              Lap{" "}
              <StealthInput
                label="Lap"
                value={String(lap + 1)}
                inputMode="numeric"
                onCommit={(n) => onSeek(lapTime(starts, n))}
              />
              /{starts.length}
            </>
          ) : (
            <StealthInput
              label="Time"
              value={clock(value - start)}
              onCommit={(s) => onSeek(Math.min(end, start + s * 1000))}
            />
          )}
        </span>
      </div>
      {onSpeed && (
        <select
          aria-label="Replay speed"
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          className="glass-control px-2 py-1.5"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      )}
      {race && <Tabs items={UNITS} value={unit} onChange={setUnit} small />}
      {children && (
        <div className="ml-auto flex items-center gap-3 sm:order-2">
          {children}
        </div>
      )}
    </div>
  );
};
