import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import type { Season } from "../shared/season.ts";
import { useJson } from "./api.ts";
import { LiveSession, Replays, type LiveInfo } from "./live/CurrentSession.tsx";
import { Loading } from "./Loading.tsx";
import { Results } from "./Results.tsx";
import { Settings } from "./Settings.tsx";
import { Stats } from "./stats/Stats.tsx";
import { Tabs } from "./Tabs.tsx";
import f1Logo from "./f1-logo.svg";

const TABS = ["Countdown", "Replays", "Results", "Stats", "Settings"] as const;
const NAV_TABS = ["Countdown", "Replays", "Results", "Stats"] as const;
type Tab = (typeof TABS)[number];

const SLUG: Record<Tab, string> = {
  Countdown: "session",
  Replays: "replay",
  Results: "results",
  Stats: "stats",
  Settings: "settings",
};

const fromPath = (): Tab =>
  location.pathname.startsWith("/session/")
    ? "Replays"
    : (TABS.find((t) => location.pathname.slice(1).startsWith(SLUG[t])) ??
      "Countdown");

export const App = () => {
  const [tab, setTab] = useState<Tab>(fromPath);
  const [visit, setVisit] = useState(0);
  const [session, setSession] = useState(0);
  const season = useJson<Season>("/api/season", 10 * 60_000);
  const info = useJson<LiveInfo>("/api/live", 30_000);
  useEffect(() => {
    const on = () => setTab(fromPath());
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  const go = (t: Tab) => {
    history.pushState(null, "", t === "Countdown" ? "/" : `/${SLUG[t]}`);
    if (t === "Countdown" && tab === "Countdown") setSession((s) => s + 1);
    setTab(t);
    setVisit((v) => v + 1);
  };
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-1.5 sm:gap-6">
        <button
          onClick={() => go("Countdown")}
          className="flex cursor-pointer items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
          aria-label="Go to live session"
          type="button"
        >
          <img
            src={f1Logo}
            alt="F1"
            className="w-10 min-[390px]:w-14 sm:w-20"
          />
          <span className="hidden text-[27px] leading-none font-extrabold tracking-wide text-white italic sm:inline">
            PITWALL
          </span>
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          <Tabs
            items={NAV_TABS}
            value={tab === "Settings" ? null : tab}
            onChange={go}
            labels={info.data?.live ? { Countdown: "Live" } : undefined}
            live={info.data?.live ? "Countdown" : undefined}
          />
        </div>
        <button
          onClick={() => go("Settings")}
          className="glass-gear ml-auto grid size-10 shrink-0 place-items-center sm:ml-0 sm:size-11"
          data-active={tab === "Settings"}
          aria-label="Settings"
          aria-pressed={tab === "Settings"}
          title="Settings"
          type="button"
        >
          <SettingsIcon
            aria-hidden="true"
            className="size-5"
            strokeWidth={1.8}
          />
        </button>
      </header>
      <main key={`session-${session}`} hidden={tab !== "Countdown"}>
        {tab === "Countdown" && <LiveSession season={season} info={info} />}
      </main>
      <main key={visit} hidden={tab === "Countdown"}>
        {tab === "Replays" && <Replays />}
        {tab === "Results" && <Results />}
        {tab === "Stats" &&
          (season.data ? (
            <Stats season={season.data} />
          ) : (
            <Loading label="Loading the season…" error={season.error} />
          ))}
        {tab === "Settings" && <Settings />}
      </main>
    </div>
  );
};
