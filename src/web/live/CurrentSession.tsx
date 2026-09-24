import { useEffect, useMemo, useState } from "react";
import type { Season } from "../../shared/season.ts";
import type { LapRow, Outline, SessionRef } from "../../shared/timing.ts";
import { useJson } from "../api.ts";
import { Countdown, current } from "./Countdown.tsx";
import { LapCharts } from "./LapCharts.tsx";
import { RaceControl, TeamRadio, Weather } from "./Panels.tsx";
import { ReplayBar } from "./ReplayBar.tsx";
import { TimingTower } from "./TimingTower.tsx";
import { TrackMap } from "./TrackMap.tsx";
import { feedUtc, useFeed, type Feed } from "./useFeed.ts";
import { messages, radios, remaining, rows as towerRows, trackStatus } from "./view.ts";

type LiveInfo = { live: boolean; positions: boolean };

interface CurrentSessionProps {
  season: Season | null;
}

interface BoardProps {
  feed: Feed;
  laps: Record<string, LapRow[]>;
  outline: Outline | null;
  replay: boolean;
  positionsNote: string | null;
  speed?: number;
}

const useTick = (ms: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

const Board = ({ feed, laps, outline, replay, positionsNote, speed }: BoardProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const now = useTick(1000);
  const state = feed.state as Record<string, any>;
  const rows = useMemo(() => towerRows(state), [state]);
  const race = /Race|Sprint$/.test(state.SessionInfo?.Type ?? "") || state.SessionInfo?.Name === "Sprint";
  const status = trackStatus(state);
  const toggle = (n: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(n)) next.add(n);
      return next;
    });
  const focus = selected.size ? [...selected] : rows.slice(0, 5).map((r) => r.number);
  const utc = replay ? feedUtc(feed) : now;
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">
          {state.SessionInfo?.Meeting?.Name} · {state.SessionInfo?.Name}
        </h1>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        {state.LapCount && (
          <span className="tabular text-zinc-300">
            Lap {state.LapCount.CurrentLap}/{state.LapCount.TotalLaps}
          </span>
        )}
        <span className="tabular ml-auto font-mono text-lg">{remaining(state, utc)}</span>
      </header>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TimingTower rows={rows} race={race} selected={selected} onToggle={toggle} />
        <div className="space-y-4">
          <TrackMap outline={outline} positions={state.Position} rows={rows} selected={selected} onToggle={toggle} note={positionsNote} positionTrail={feed.positionTrail} speed={speed} />
          <Weather weather={state.WeatherData} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        <RaceControl messages={messages(state)} />
        <LapCharts laps={laps} rows={rows} focus={focus} until={replay ? feed.t : null} race={race} />
      </div>
      <TeamRadio radios={radios(state)} rows={rows} />
    </div>
  );
};

interface LiveProps {
  positions: boolean;
}

const Live = ({ positions }: LiveProps) => {
  const feed = useFeed("/api/live/stream");
  const laps = useJson<Record<string, LapRow[]>>("/api/live/laps", 15_000);
  const outline = useJson<Outline | null>("/api/live/outline", 60_000);
  if (!feed) return <p className="text-zinc-400">Connecting to live timing…</p>;
  const note = positions ? null : "Add an F1TV token in Settings to see the cars.";
  return <Board feed={feed} laps={laps.data ?? {}} outline={outline.data ?? null} replay={false} positionsNote={note} />;
};

const Replay = () => {
  const sessions = useJson<SessionRef[]>("/api/replay/sessions");
  const [path, setPath] = useState<string | null>(null);
  const [play, setPlay] = useState<{ t: number | null; speed: number; on: boolean }>({ t: null, speed: 4, on: true });
  const chosen = path ?? sessions.data?.at(-1)?.path ?? null;
  const q = chosen ? `path=${encodeURIComponent(chosen)}` : null;
  const url = q && play.on ? `/api/replay/stream?${q}&speed=${play.speed}${play.t === null ? "" : `&t=${play.t}`}` : null;
  const feed = useFeed(url);
  const laps = useJson<Record<string, LapRow[]>>(q && `/api/replay/laps?${q}`);
  const outline = useJson<Outline | null>(q && `/api/replay/outline?${q}`);
  const pick = (p: string) => {
    setPath(p);
    setPlay((s) => ({ ...s, t: null, on: true }));
  };
  return (
    <div className="space-y-4">
      <ReplayBar
        sessions={sessions.data ?? []}
        path={chosen}
        onPath={pick}
        feed={feed}
        playing={play.on}
        speed={play.speed}
        onToggle={() => setPlay((s) => ({ ...s, on: !s.on, t: feed?.t ?? s.t }))}
        onSpeed={(speed) => setPlay((s) => ({ ...s, speed, t: feed?.t ?? s.t }))}
        onSeek={(t) => setPlay((s) => ({ ...s, t, on: true }))}
      />
      {!feed ? (
        <p className="text-zinc-400">{sessions.error ?? "Loading the replay. A race takes a few seconds…"}</p>
      ) : (
        <Board feed={feed} laps={laps.data ?? {}} outline={outline.data ?? null} replay positionsNote={null} speed={play.speed} />
      )}
    </div>
  );
};

export const CurrentSession = ({ season }: CurrentSessionProps) => {
  const info = useJson<LiveInfo>("/api/live", 30_000);
  if (!info.data) return <p className="text-zinc-400">{info.error ?? "Loading…"}</p>;
  if (info.data.live) return <Live positions={info.data.positions} />;
  const scheduled = current(season?.rounds ?? [], Date.now());
  return (
    <div className="space-y-4">
      {scheduled ? (
        <div className="rounded-xl bg-gradient-to-r from-red-700/40 to-surface p-4">
          <h1 className="text-lg font-bold">{scheduled.round.name} · {scheduled.label}</h1>
          <p className="mt-1 text-sm text-zinc-300">Live timing is unavailable. Reconnecting…</p>
        </div>
      ) : <Countdown rounds={season?.rounds ?? []} />}
      <Replay />
    </div>
  );
};
