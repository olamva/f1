import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Flag, Pause, Play } from "lucide-react";
import type { Period } from "../../shared/timing.ts";
import { Tabs } from "../Tabs.tsx";
import { StealthInput } from "./StealthInput.tsx";
import { clockSeconds, lapPosition, lapTime } from "./view.ts";

const SPEEDS = [1, 2, 4, 8, 16, 32];
const UNITS = ["time", "laps"] as const;
const TONES: Record<Period["kind"], string> = {
  sc: "bg-yellow-400",
  vsc: "bg-yellow-400/50",
  red: "bg-red-500",
};

interface ReplayBarProps {
  race: boolean;
  starts: number[];
  start: number;
  end: number;
  at: number;
  periods: Period[] | null;
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
  periods,
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
  const [flags, setFlags] = useState(false);
  const down = useRef(0);
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
  const place = (t: number) =>
    Math.max(
      0,
      Math.min(
        1,
        ((laps ? lapPosition(starts, t) : t) - min) / Math.max(1, max - min),
      ),
    );
  const bands = flags
    ? (periods ?? [])
        .filter((p) => p.from <= end && (p.to ?? end) >= start)
        .map((p) => ({
          ...p,
          left: place(p.from),
          width: place(Math.min(p.to ?? end, end)) - place(p.from),
        }))
    : [];
  const tapped = (e: PointerEvent<HTMLInputElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left - 14) / (box.width - 28);
    const slop = 4 / (box.width - 28);
    return Math.abs(e.clientX - down.current) < 4
      ? bands.find(
          (b) =>
            x >= b.left - slop && x <= b.left + Math.max(b.width, slop) + slop,
        )
      : undefined;
  };
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
          {bands.map((b) => (
            <span
              key={b.from}
              aria-hidden="true"
              className={`absolute top-[28px] h-1 rounded-full ${TONES[b.kind]}`}
              style={{
                left: `calc(14px + (100% - 28px) * ${b.left})`,
                width: `max(4px, calc((100% - 28px) * ${b.width}))`,
              }}
            />
          ))}
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
              down.current = e.clientX;
              setHeld(true);
              setDrag(toT(Number(e.currentTarget.value)));
            }}
            onPointerUp={(e) => {
              if (!held) return;
              onSeek(tapped(e)?.from ?? toT(Number(e.currentTarget.value)));
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
                onCommit={(text) => onSeek(lapTime(starts, Number(text)))}
              />
              /{starts.length}
            </>
          ) : (
            <StealthInput
              label="Time"
              value={clock(value - start)}
              onCommit={(text) =>
                onSeek(Math.min(end, start + clockSeconds(text) * 1000))
              }
            />
          )}
        </span>
      </div>
      <button
        onClick={() => setFlags(!flags)}
        aria-pressed={flags}
        aria-label="Flag periods"
        title={flags ? "Hide flag periods" : "Show flag periods"}
        className="glass-control grid size-9 cursor-pointer place-items-center"
      >
        <Flag
          aria-hidden="true"
          className={`size-4 ${flags ? "fill-yellow-400 text-yellow-400" : ""}`}
        />
      </button>
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
