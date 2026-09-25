import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import type { Season } from "../shared/season.ts";
import { useJson } from "./api.ts";
import { LiveSession, Replays, type LiveInfo } from "./live/CurrentSession.tsx";
import { Loading } from "./Loading.tsx";
import { Settings } from "./Settings.tsx";
import { Stats } from "./stats/Stats.tsx";
import { Tabs } from "./Tabs.tsx";
import f1Logo from "./f1-logo.svg";

const TABS = ["Countdown", "Replays", "Stats", "Settings"] as const;
const CONTENT_TABS = ["Replays", "Stats"] as const;
type Tab = (typeof TABS)[number];

const SLUG: Record<Tab, string> = {
  Countdown: "session",
  Replays: "replay",
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
      <header className="app-nav flex items-center gap-1.5 sm:gap-6">
        <button
          onClick={() => go("Countdown")}
          className="cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
          aria-label="Go to live session"
          type="button"
        >
          <img
            src={f1Logo}
            alt="F1"
            className="w-10 min-[390px]:w-14 sm:w-20"
          />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-3">
          <button
            onClick={() => go("Countdown")}
            className="glass-gear flex h-12 shrink-0 items-center px-2.5 text-sm font-semibold sm:h-13 sm:px-4 sm:text-base"
            data-active={tab === "Countdown"}
            aria-pressed={tab === "Countdown"}
            type="button"
          >
            {info.data?.live && (
              <span aria-hidden="true" className="live-dot" />
            )}
            {info.data?.live ? "Live" : "Countdown"}
          </button>
          <Tabs
            items={CONTENT_TABS}
            value={tab === "Replays" || tab === "Stats" ? tab : null}
            onChange={go}
          />
        </div>
        <button
          onClick={() => go("Settings")}
          className="glass-gear grid size-10 shrink-0 place-items-center sm:size-11"
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
