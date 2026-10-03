import { ArrowDownToLine } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { LapRow, Outline } from "../../shared/timing.ts";
import { Flag } from "../Flag.tsx";
import { LapCharts } from "./LapCharts.tsx";
import { RaceControl, TeamRadio, Weather } from "./Panels.tsx";
import { StealthInput } from "./StealthInput.tsx";
import { TimingTower } from "./TimingTower.tsx";
import { TrackMap } from "./TrackMap.tsx";
import { feedUtc, type Feed } from "./useFeed.ts";
import {
  isQualifying,
  messages,
  qualifyingPart,
  radios,
  remaining,
  rows as towerRows,
  sectorFlags,
  sessionBests,
  sessionStart,
  trackStatus,
  trackTemps,
} from "./view.ts";

interface BoardProps {
  feed: Feed;
  laps: Record<string, LapRow[]>;
  outline: Outline | null;
  positionsNote: string | null;
  speed?: number;
  paused?: boolean;
  utc?: number;
  onLap: (lap: number) => void;
}

interface StatusProps {
  ref: React.Ref<HTMLDivElement>;
  lap?: { CurrentLap: number; TotalLaps: number };
  part: string | null;
  banner: React.ReactNode;
  clock: string;
  onLap: (lap: number) => void;
}

const Status = ({ ref, lap, part, banner, clock, onLap }: StatusProps) => (
  <div ref={ref} className="flex scroll-mt-4 flex-wrap items-center gap-3">
    {lap && (
      <span className="tabular font-f1 text-2xl font-black">
        <span className="font-f1-wide mr-2 text-sm text-zinc-400">LAP</span>
        <StealthInput
          label="Lap"
          value={String(lap.CurrentLap)}
          inputMode="numeric"
          onCommit={(text) => onLap(Number(text))}
        />
        <span className="text-zinc-500">/{lap.TotalLaps}</span>
      </span>
    )}
    {part && (
      <span className="font-f1 rounded bg-zinc-700 px-2 py-0.5 text-lg font-bold">
        {part}
      </span>
    )}
    {banner && (
      <div className="order-last grow basis-full sm:order-none sm:basis-60">
        {banner}
      </div>
    )}
    <span className="tabular ml-auto font-mono text-xl">{clock}</span>
  </div>
);

export const Board = ({
  feed,
  laps,
  outline,
  positionsNote,
  speed,
  paused,
  utc = feedUtc(feed),
  onLap,
}: BoardProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const top = useRef<HTMLDivElement>(null);
  const state = feed.state as Record<string, any>;
  const rows = useMemo(() => towerRows(state), [state]);
  const bests = useMemo(() => sessionBests(state, rows), [state, rows]);
  const race =
    /Race|Sprint$/.test(state.SessionInfo?.Type ?? "") ||
    state.SessionInfo?.Name === "Sprint";
  const qualifying = isQualifying(state.SessionInfo);
  const status = trackStatus(state);
  const part = qualifyingPart(state);
  const toggle = (n: string) =>
    setSelected((s) => new Set(s.has(n) ? [] : [n]));
  const focus = selected.size
    ? [...selected]
    : rows.slice(0, 5).map((r) => r.number);
  const banner = status && (
    <div
      role="alert"
      className={`flag-banner font-f1 rounded-md px-4 py-0.5 text-center text-lg font-black tracking-widest uppercase ${status.tone} ${paused ? "paused" : ""}`}
    >
      {status.label}
    </div>
  );
  return (
    <div className="board space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-f1 text-xl font-bold">
          <Flag country={state.SessionInfo?.Meeting?.Country?.Name} />
          {state.SessionInfo?.Meeting?.Name} · {state.SessionInfo?.Name}
        </h1>
        <button
          type="button"
          onClick={() => top.current!.scrollIntoView({ behavior: "smooth" })}
          title="Scroll the timing to the top of the screen"
          className="glass-gear ml-auto flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm"
        >
          <ArrowDownToLine aria-hidden="true" size={16} />
          Focus
        </button>
      </header>
      <Status
        ref={top}
        lap={state.LapCount}
        part={part}
        banner={banner}
        clock={remaining(state, utc)}
        onLap={onLap}
      />
      <div
        className={`grid grid-rows-[auto_1fr] gap-4 md:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)] ${race ? "xl:grid-cols-[auto_repeat(2,minmax(0,1fr))] xl:grid-rows-none" : "2xl:grid-cols-[auto_repeat(2,minmax(0,1fr))] 2xl:grid-rows-none"}`}
      >
        <div className="grid min-w-0 md:col-span-2 lg:col-span-1">
          <TimingTower
            rows={rows}
            race={race}
            qualifying={qualifying}
            bests={bests}
            selected={selected}
            onToggle={toggle}
          />
        </div>
        <div
          className={`flex flex-col gap-4 lg:row-span-2 ${race ? "xl:row-span-1" : "2xl:row-span-1"}`}
        >
          <TrackMap
            outline={outline}
            positions={state.Position}
            rows={rows}
            bests={bests}
            race={race}
            selected={selected}
            onToggle={toggle}
            note={positionsNote}
            positionTrail={feed.positionTrail}
            time={feed.t}
            speed={speed}
            stream={feed.src}
            banner={banner}
            circuit={state.SessionInfo?.Meeting?.Circuit?.Key}
            flags={sectorFlags(state)}
          />
          <RaceControl
            messages={messages(state)}
            rows={rows}
            start={sessionStart(state)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <TeamRadio radios={radios(state)} rows={rows} selected={selected} />
          <Weather weather={state.WeatherData} trend={trackTemps(state)} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        <LapCharts
          laps={laps}
          rows={rows}
          focus={focus}
          until={feed.t}
          race={race}
        />
      </div>
    </div>
  );
};
