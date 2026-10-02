import { ChevronLeft, Eye, Settings, SkipBack } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Season } from "../../shared/season.ts";
import type { LapRow, Outline, SessionRef } from "../../shared/timing.ts";
import { useJson, type Loaded } from "../api.ts";
import { useDelay } from "../delay.ts";
import { DelayInput } from "../DelayInput.tsx";
import { Flag } from "../Flag.tsx";
import { navigate, pathPart, setPathPart, standalone } from "../path.ts";
import { useVisible } from "../visible.ts";
import { Loading } from "../Loading.tsx";
import { Board } from "./Board.tsx";
import { CalendarList } from "./CalendarList.tsx";
import { Countdown, current } from "./Countdown.tsx";
import { clip } from "./Panels.tsx";
import { ReplayBar } from "./ReplayBar.tsx";
import { useFeed, type Feed } from "./useFeed.ts";
import { lapStarts, lapTime } from "./view.ts";

export type LiveInfo = {
  live: boolean;
  recent: boolean;
  positions: boolean;
  start: number | null;
  info: Record<string, any> | null;
};

interface LiveSessionProps {
  season: Loaded<Season>;
  info: Loaded<LiveInfo>;
}

const useTick = (ms: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

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

type Rewind = { session: string; back: number; pausedAt: number | null };

const rewind = (session: string, back: number, pausedAt: number | null) =>
  localStorage.setItem(
    "rewind",
    JSON.stringify({ session, back, pausedAt } satisfies Rewind),
  );

interface GoLiveProps {
  behind: number;
  onClick: () => void;
}

const GoLive = ({ behind, onClick }: GoLiveProps) => (
  <button
    onClick={onClick}
    title="Go to live"
    className="glass-control tabular flex cursor-pointer items-center px-3 py-1.5 text-sm font-semibold"
  >
    <span
      aria-hidden="true"
      className={
        behind < 1000 ? "live-dot" : "mr-2 size-2 rounded-full bg-zinc-500"
      }
    />
    {behind < 1000 ? "LIVE" : `−${clip(behind / 1000)}`}
  </button>
);

const DelaySettings = () => (
  <>
    <button
      popoverTarget="tv-delay"
      aria-label="TV delay"
      title="TV delay"
      className="glass-control grid size-9 cursor-pointer place-items-center [anchor-name:--tv-delay]"
    >
      <Settings aria-hidden="true" className="size-4" />
    </button>
    <div
      id="tv-delay"
      popover="auto"
      className="tv-delay bg-surface w-64 space-y-2 rounded-xl border border-white/10 p-4 text-sm text-zinc-100 shadow-lg"
    >
      <h2 className="font-f1 font-bold">TV delay</h2>
      <p className="text-zinc-400">
        Hold live timing back to match the F1TV stream, up to 60 seconds.
      </p>
      <DelayInput />
    </div>
  </>
);

const liveStart = (feed: Feed | null) =>
  Math.max(feed?.since ?? 0, feed?.start ?? 0);

interface LiveProps {
  session: string;
  positions: boolean;
}

const Live = ({ session, positions }: LiveProps) => {
  const live = useDelay() * 1000;
  const [pos, setPos] = useState<Rewind>(() => {
    const saved = JSON.parse(localStorage.getItem("rewind") ?? "null");
    if (saved?.session !== session) return { session, back: 0, pausedAt: null };
    return saved.pausedAt === null
      ? saved
      : {
          session,
          back: saved.back + Date.now() - saved.pausedAt,
          pausedAt: Date.now(),
        };
  });
  const [loading, setLoading] = useState(pos.pausedAt !== null);
  const now = useTick(1000);
  const visible = useVisible();
  const url =
    visible && (pos.pausedAt === null || loading)
      ? `/api/live/stream?delay=${Math.round(live + pos.back)}`
      : null;
  const [feed, due] = useFeed(url, live + pos.back);
  if (loading && feed) setLoading(false);
  const waiting = !!due && due > Date.now() && feed?.src !== url;
  const laps = useJson<Record<string, LapRow[]>>("/api/live/laps", 15_000);
  const outline = useJson<Outline | null>("/api/live/outline", 60_000);
  const note = positions
    ? null
    : "Add an F1TV token in Settings to see the cars.";
  const behind = pos.back + (pos.pausedAt === null ? 0 : now - pos.pausedAt);
  const rows = laps.data ?? {};
  const race = Boolean(feed?.state.LapCount);
  const start = liveStart(feed);
  const starts = useMemo(
    () => (race ? lapStarts(rows, start, true) : []),
    [race, rows, start],
  );
  const move = (back: number, pausedAt: number | null = null) => {
    rewind(session, back, pausedAt);
    setPos({ session, back, pausedAt });
  };
  const seek = (t: number) => {
    const back = Date.now() - t - live;
    move(back < 1000 ? 0 : back);
  };
  const toggle = () =>
    pos.pausedAt === null
      ? move(pos.back, Date.now())
      : move(pos.back + Date.now() - pos.pausedAt);
  const goLive = <GoLive behind={behind} onClick={() => move(0)} />;
  return (
    <div className="space-y-4">
      {feed && !waiting ? (
        <>
          <ReplayBar
            race={race}
            starts={starts}
            start={start}
            end={now - live}
            at={now - live - behind}
            playing={pos.pausedAt === null}
            onToggle={toggle}
            onSeek={seek}
          >
            {goLive}
            <DelaySettings />
          </ReplayBar>
          <Board
            feed={feed}
            laps={rows}
            outline={outline.data ?? null}
            positionsNote={note}
            paused={pos.pausedAt !== null}
            utc={now - live - behind}
            onLap={(n) => seek(lapTime(starts, n))}
          />
        </>
      ) : waiting ? (
        <>
          <div className="flex justify-end">{goLive}</div>
          <DelayWait due={due} delay={live + pos.back} />
        </>
      ) : (
        <Loading label="Connecting to live timing…" />
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
  const seek = (t: number) => setPlay((s) => ({ ...s, t, on: true }));
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
        race={/^(Race|Sprint)$/.test(session.name)}
        starts={starts}
        start={feed?.start ?? 0}
        end={feed?.duration ?? 0}
        at={(feed?.src === url ? null : play.t) ?? feed?.t ?? 0}
        playing={play.on}
        speed={play.speed}
        onToggle={() =>
          setPlay((s) => ({ ...s, on: !s.on, t: feed?.t ?? s.t }))
        }
        onSpeed={(speed) =>
          setPlay((s) => ({ ...s, speed, t: feed?.t ?? s.t }))
        }
        onSeek={seek}
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
          positionsNote={null}
          speed={play.speed}
          paused={!play.on}
          onLap={(n) => seek(lapTime(starts, n))}
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
  const live = useDelay() * 1000;
  if (info.data?.live) wasLive.current = true;
  if (!info.data || !season.data)
    return <Loading label="Loading…" error={info.error ?? season.error} />;
  const key = String(info.data.info?.Key);
  const start = info.data.start;
  const go = (back: number) => {
    rewind(key, back, null);
    localStorage.setItem("continued", key);
    setContinued(key);
  };
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => go(0)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold"
          >
            <Eye aria-hidden="true" className="size-4" />
            Continue to live timing
          </button>
          {start !== null && (
            <button
              onClick={() => go(Math.max(0, Date.now() - start - live))}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-4 py-1.5 text-sm font-semibold hover:bg-zinc-700"
            >
              <SkipBack aria-hidden="true" className="size-4" />
              From start
            </button>
          )}
        </div>
      </div>
    ) : (
      <Live key={key} session={key} positions={info.data.positions} />
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
  const pushed = useRef(false);
  const open = (s: SessionRef) => {
    navigate(`/calendar/${encodeURIComponent(s.path)}`);
    pushed.current = !standalone;
    setPath(s.path);
  };
  const close = () => {
    if (pushed.current) return history.back();
    setPathPart("calendar", null);
    setPath(null);
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
    return <Replay key={chosen.path} session={chosen} onClose={close} />;
  return (
    <CalendarList
      sessions={sessions.data}
      rounds={season.data.rounds}
      onStart={open}
    />
  );
};
