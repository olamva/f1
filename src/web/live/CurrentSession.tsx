import { ArrowDownToLine, ChevronLeft, Eye } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Season } from "../../shared/season.ts";
import {
  MAX_DELAY_MS,
  type LapRow,
  type Outline,
  type SessionRef,
} from "../../shared/timing.ts";
import { useJson, type Loaded } from "../api.ts";
import { Flag } from "../Flag.tsx";
import { pathPart, setPathPart } from "../path.ts";
import { useVisible } from "../visible.ts";
import { Loading } from "../Loading.tsx";
import { CalendarList } from "./CalendarList.tsx";
import { Countdown, current } from "./Countdown.tsx";
import { LapCharts } from "./LapCharts.tsx";
import { clip, RaceControl, TeamRadio, Weather } from "./Panels.tsx";
import { ReplayBar } from "./ReplayBar.tsx";
import { TimingTower } from "./TimingTower.tsx";
import { TrackMap } from "./TrackMap.tsx";
import { feedUtc, useFeed, type Feed } from "./useFeed.ts";
import {
  isQualifying,
  messages,
  lapStarts,
  qualifyingPart,
  radios,
  remaining,
  rows as towerRows,
  sessionBests,
  sessionStart,
  trackStatus,
} from "./view.ts";

export type LiveInfo = {
  live: boolean;
  recent: boolean;
  positions: boolean;
  info: Record<string, any> | null;
};

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
    title="Delay behind live, up to 10 minutes, to match the F1TV stream"
    className="tabular flex items-center text-xs text-zinc-500"
  >
    −
    <input
      inputMode="numeric"
      placeholder="0"
      value={delay || ""}
      onChange={(e) =>
        onDelay(
          Math.min(
            MAX_DELAY_MS / 1000,
            Number(e.target.value.replace(/\D/g, "")),
          ),
        )
      }
      className="w-7 bg-transparent text-right text-zinc-400 outline-none placeholder:text-zinc-600 focus:text-zinc-100"
    />
    s
  </label>
);

interface DelayWaitProps {
  due: number;
  delay: number;
}

const DelayWait = ({ due, delay }: DelayWaitProps) => {
  const left = Math.max(0, due - useTick(1000));
  return (
    <div
      role="status"
      className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-zinc-400"
    >
      <div
        className="glass-seek relative w-64"
        style={{ "--progress": 1 - left / delay } as CSSProperties}
      >
        <span aria-hidden="true" className="glass-seek-track" />
      </div>
      <p>
        Connected. Live timing starts after your delay, in {clip(left / 1000)}.
      </p>
    </div>
  );
};

interface StatusProps {
  ref: React.Ref<HTMLDivElement>;
  lap?: { CurrentLap: number; TotalLaps: number };
  part: string | null;
  banner: React.ReactNode;
  clock: string;
  delay: React.ReactNode;
}

const Status = ({ ref, lap, part, banner, clock, delay }: StatusProps) => (
  <div ref={ref} className="flex scroll-mt-4 flex-wrap items-center gap-3">
    {lap && (
      <span className="tabular font-f1 text-2xl font-black">
        <span className="font-f1-wide mr-2 text-sm text-zinc-400">LAP</span>
        {lap.CurrentLap}
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
    <div className="ml-auto flex items-center gap-2">
      {delay}
      <span className="tabular font-mono text-xl">{clock}</span>
    </div>
  </div>
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
  const top = useRef<HTMLDivElement>(null);
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
    setSelected((s) => new Set(s.has(n) ? [] : [n]));
  const focus = selected.size
    ? [...selected]
    : rows.slice(0, 5).map((r) => r.number);
  const utc = replay ? feedUtc(feed) : now - delay;
  const banner = status && (
    <div
      role="alert"
      className={`flag-banner font-f1 rounded-md px-4 py-0.5 text-center text-lg font-black tracking-widest uppercase ${status.tone}${paused ? "paused" : ""}`}
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
        delay={onDelay && <DelayInput delay={delay / 1000} onDelay={onDelay} />}
      />
      <div
        className={`grid gap-4 ${race ? "lg:grid-cols-[auto_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"}`}
      >
        <TimingTower
          rows={rows}
          race={race}
          qualifying={qualifying}
          bests={bests}
          selected={selected}
          onToggle={toggle}
        />
        <div
          className={`grid content-start gap-4 ${race ? "xl:grid-cols-2 xl:content-stretch" : ""}`}
        >
          <div className="flex flex-col gap-4">
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
            />
            <RaceControl
              messages={messages(state)}
              rows={rows}
              start={sessionStart(state)}
            />
          </div>
          <div className="flex flex-col gap-4">
            <TeamRadio radios={radios(state)} rows={rows} />
            <Weather weather={state.WeatherData} />
          </div>
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

interface LiveProps {
  positions: boolean;
}

const Live = ({ positions }: LiveProps) => {
  const [delay, setDelay] = useState(
    () => Number(localStorage.getItem("delay")) || 0,
  );
  const visible = useVisible();
  const url = visible ? `/api/live/stream?delay=${delay}` : null;
  const [feed, due] = useFeed(url, delay * 1000);
  const waiting = !!due && due > Date.now() && feed?.src !== url;
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
      {feed && !waiting ? (
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
          {waiting ? (
            <DelayWait due={due} delay={delay * 1000} />
          ) : (
            <Loading label="Connecting to live timing…" />
          )}
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
  const visible = useVisible();
  const q = `path=${encodeURIComponent(session.path)}`;
  const url =
    play.on && visible
      ? `/api/replay/stream?${q}&speed=${play.speed}${play.t === null ? "" : `&t=${play.t}`}`
      : null;
  const [feed] = useFeed(url);
  useEffect(() => {
    if (!visible) setPlay((s) => ({ ...s, t: feed?.t ?? s.t }));
  }, [visible, feed?.t]);
  const laps = useJson<Record<string, LapRow[]>>(`/api/replay/laps?${q}`);
  const outline = useJson<Outline | null>(`/api/replay/outline?${q}`);
  const race = Boolean(feed?.state.LapCount);
  const starts = useMemo(
    () => (race && feed?.start ? lapStarts(laps.data ?? {}, feed.start) : []),
    [race, laps.data, feed?.start],
  );
  return (
    <div className="space-y-4">
      <button
        onClick={onClose}
        className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-zinc-100"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        All replays
      </button>
      <ReplayBar
        session={session}
        starts={starts}
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
  const [continued, setContinued] = useState(() =>
    localStorage.getItem("continued"),
  );
  if (info.data?.live) wasLive.current = true;
  if (!info.data || !season.data)
    return <Loading label="Loading…" error={info.error ?? season.error} />;
  const key = String(info.data.info?.Key);
  if (info.data.live || info.data.recent || wasLive.current)
    return localStorage.getItem("spoilers") !== "0" && continued !== key ? (
      <div className="to-surface space-y-3 rounded-xl bg-gradient-to-r from-red-700/40 p-4">
        <div>
          <h1 className="font-f1 text-lg font-bold">
            <Flag country={info.data.info?.Meeting?.Country?.Name} />
            {info.data.info?.Meeting?.Name} · {info.data.info?.Name}
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Spoiler mode hides the live timing for this session.
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem("continued", key);
            setContinued(key);
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold"
        >
          <Eye aria-hidden="true" className="size-4" />
          Continue to live timing
        </button>
      </div>
    ) : (
      <Live positions={info.data.positions} />
    );
  const scheduled = current(season.data.rounds, Date.now());
  return scheduled ? (
    <div className="to-surface rounded-xl bg-gradient-to-r from-red-700/40 p-4">
      <h1 className="font-f1 text-lg font-bold">
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

interface CalendarProps {
  season: Loaded<Season>;
}

export const Calendar = ({ season }: CalendarProps) => {
  const sessions = useJson<SessionRef[]>("/api/replay/sessions");
  const [path, setPath] = useState(() => pathPart("calendar"));
  const choose = (s: SessionRef | null) => {
    setPathPart("calendar", s?.path ?? null);
    setPath(s?.path ?? null);
  };
  const chosen = sessions.data?.find((s) => s.path === path);
  if (!sessions.data || !season.data)
    return (
      <Loading
        label="Loading the calendar…"
        error={sessions.error ?? season.error}
      />
    );
  if (chosen)
    return (
      <Replay key={chosen.path} session={chosen} onClose={() => choose(null)} />
    );
  return (
    <CalendarList
      sessions={sessions.data}
      rounds={season.data.rounds}
      onStart={choose}
    />
  );
};
