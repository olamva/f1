import { useEffect, useMemo, useRef, useState } from "react";
import type { Season } from "../../shared/season.ts";
import type { LapRow, Outline, SessionRef } from "../../shared/timing.ts";
import { useJson, type Loaded } from "../api.ts";
import { Flag } from "../Flag.tsx";
import { pathPart, setPathPart } from "../path.ts";
import { Loading } from "../Loading.tsx";
import { Countdown, current } from "./Countdown.tsx";
import { LapCharts } from "./LapCharts.tsx";
import { RaceControl, TeamRadio, Weather } from "./Panels.tsx";
import { ReplayBar } from "./ReplayBar.tsx";
import { ReplayPicker } from "./ReplayPicker.tsx";
import { TimingTower } from "./TimingTower.tsx";
import { TrackMap } from "./TrackMap.tsx";
import { feedUtc, useFeed, type Feed } from "./useFeed.ts";
import {
  isQualifying,
  messages,
  qualifyingPart,
  radios,
  remaining,
  rows as towerRows,
  sessionBests,
  sessionStart,
  trackStatus,
} from "./view.ts";

export type LiveInfo = { live: boolean; recent: boolean; positions: boolean };

interface LiveSessionProps {
  season: Loaded<Season>;
  info: Loaded<LiveInfo>;
}

interface BoardProps {
  feed: Feed;
  laps: Record<string, LapRow[]>;
  outline: Outline | null;
  replay: boolean;
  positionsNote: string | null;
  speed?: number;
  paused?: boolean;
  delay?: number;
  onDelay?: (s: number) => void;
}

const useTick = (ms: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

interface DelayInputProps {
  delay: number;
  onDelay: (s: number) => void;
}

const DelayInput = ({ delay, onDelay }: DelayInputProps) => (
  <label
    title="Delay behind live, to match the F1TV stream"
    className="tabular flex items-center text-xs text-zinc-500"
  >
    −
    <input
      inputMode="numeric"
      placeholder="0"
      value={delay || ""}
      onChange={(e) => onDelay(Number(e.target.value.replace(/\D/g, "")))}
      className="w-7 bg-transparent text-right text-zinc-400 outline-none placeholder:text-zinc-600 focus:text-zinc-100"
    />
    s
  </label>
);

const Board = ({
  feed,
  laps,
  outline,
  replay,
  positionsNote,
  speed,
  paused,
  delay = 0,
  onDelay,
}: BoardProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const now = useTick(1000);
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
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(n)) next.add(n);
      return next;
    });
  const focus = selected.size
    ? [...selected]
    : rows.slice(0, 5).map((r) => r.number);
  const utc = replay ? feedUtc(feed) : now - delay;
  const banner = status && (
    <div
      role="alert"
      className={`flag-banner rounded-md px-4 py-2 text-center text-lg font-black tracking-widest uppercase ${status.tone}${paused ? "paused" : ""}`}
    >
      {status.label}
    </div>
  );
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">
          <Flag country={state.SessionInfo?.Meeting?.Country?.Name} />
          {state.SessionInfo?.Meeting?.Name} · {state.SessionInfo?.Name}
        </h1>
        {part && (
          <span className="rounded bg-zinc-700 px-2 py-0.5 text-sm font-bold">
            {part}
          </span>
        )}
        {state.LapCount && (
          <span className="tabular text-zinc-300">
            Lap {state.LapCount.CurrentLap}/{state.LapCount.TotalLaps}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onDelay && <DelayInput delay={delay / 1000} onDelay={onDelay} />}
          <span className="tabular font-mono text-lg">
            {remaining(state, utc)}
          </span>
        </div>
      </header>
      {banner}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TimingTower
          rows={rows}
          race={race}
          qualifying={qualifying}
          bests={bests}
          selected={selected}
          onToggle={toggle}
        />
        <div className="space-y-4">
          <TrackMap
            outline={outline}
            positions={state.Position}
            rows={rows}
            race={race}
            selected={selected}
            onToggle={(n) =>
              setSelected((s) => new Set(s.size === 1 && s.has(n) ? [] : [n]))
            }
            note={positionsNote}
            positionTrail={feed.positionTrail}
            speed={speed}
            banner={banner}
          />
          <Weather weather={state.WeatherData} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        <RaceControl
          messages={messages(state)}
          rows={rows}
          start={sessionStart(state)}
        />
        <LapCharts
          laps={laps}
          rows={rows}
          focus={focus}
          until={replay ? feed.t : null}
          race={race}
        />
      </div>
      <TeamRadio radios={radios(state)} rows={rows} />
    </div>
  );
};

interface LiveProps {
  positions: boolean;
}

const Live = ({ positions }: LiveProps) => {
  const [delay, setDelay] = useState(
    () => Number(localStorage.getItem("delay")) || 0,
  );
  const feed = useFeed("/api/live/stream", delay * 1000);
  const laps = useJson<Record<string, LapRow[]>>("/api/live/laps", 15_000);
  const outline = useJson<Outline | null>("/api/live/outline", 60_000);
  const note = positions
    ? null
    : "Add an F1TV token in Settings to see the cars.";
  const change = (s: number) => {
    localStorage.setItem("delay", String(s));
    setDelay(s);
  };
  return (
    <div className="space-y-4">
      {feed ? (
        <Board
          feed={feed}
          laps={laps.data ?? {}}
          outline={outline.data ?? null}
          replay={false}
          positionsNote={note}
          delay={delay * 1000}
          onDelay={change}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <DelayInput delay={delay} onDelay={change} />
          </div>
          <Loading label="Connecting to live timing…" />
        </div>
      )}
    </div>
  );
};

interface ReplayProps {
  session: SessionRef;
  onClose: () => void;
}

const Replay = ({ session, onClose }: ReplayProps) => {
  const [play, setPlay] = useState<{
    t: number | null;
    speed: number;
    on: boolean;
  }>({ t: null, speed: 4, on: true });
  const q = `path=${encodeURIComponent(session.path)}`;
  const url = play.on
    ? `/api/replay/stream?${q}&speed=${play.speed}${play.t === null ? "" : `&t=${play.t}`}`
    : null;
  const feed = useFeed(url);
  const laps = useJson<Record<string, LapRow[]>>(`/api/replay/laps?${q}`);
  const outline = useJson<Outline | null>(`/api/replay/outline?${q}`);
  return (
    <div className="space-y-4">
      <ReplayBar
        session={session}
        onClose={onClose}
        feed={feed}
        pending={feed?.src === url ? null : play.t}
        playing={play.on}
        speed={play.speed}
        onToggle={() =>
          setPlay((s) => ({ ...s, on: !s.on, t: feed?.t ?? s.t }))
        }
        onSpeed={(speed) =>
          setPlay((s) => ({ ...s, speed, t: feed?.t ?? s.t }))
        }
        onSeek={(t) => setPlay((s) => ({ ...s, t, on: true }))}
      />
      {!feed ? (
        <Loading
          label="Loading the replay. A race takes a few seconds…"
          error={laps.error}
        />
      ) : (
        <Board
          feed={feed}
          laps={laps.data ?? {}}
          outline={outline.data ?? null}
          replay
          positionsNote={null}
          speed={play.speed}
          paused={!play.on}
        />
      )}
    </div>
  );
};

export const LiveSession = ({ season, info }: LiveSessionProps) => {
  const wasLive = useRef(false);
  if (info.data?.live) wasLive.current = true;
  if (!info.data || !season.data)
    return <Loading label="Loading…" error={info.error ?? season.error} />;
  if (info.data.live || info.data.recent || wasLive.current)
    return <Live positions={info.data.positions} />;
  const scheduled = current(season.data.rounds, Date.now());
  return scheduled ? (
    <div className="to-surface rounded-xl bg-gradient-to-r from-red-700/40 p-4">
      <h1 className="text-lg font-bold">
        <Flag country={scheduled.round.country} />
        {scheduled.round.name} · {scheduled.label}
      </h1>
      <p className="mt-1 text-sm text-zinc-300">
        Live timing is unavailable. Reconnecting…
      </p>
    </div>
  ) : (
    <Countdown rounds={season.data.rounds} />
  );
};

export const Replays = () => {
  const sessions = useJson<SessionRef[]>("/api/replay/sessions");
  const [path, setPath] = useState(
    () => pathPart("replay") ?? pathPart("session"),
  );
  const choose = (s: SessionRef | null) => {
    setPathPart("replay", s?.path ?? null);
    setPath(s?.path ?? null);
  };
  const chosen = sessions.data?.find((s) => s.path === path);
  if (!sessions.data)
    return <Loading label="Loading past sessions…" error={sessions.error} />;
  if (chosen)
    return (
      <Replay key={chosen.path} session={chosen} onClose={() => choose(null)} />
    );
  return <ReplayPicker sessions={sessions.data} onStart={choose} />;
};
