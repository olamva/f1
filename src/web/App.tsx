import { useEffect, useState } from "react";
import type { Season } from "../shared/season.ts";
import { useJson } from "./api.ts";
import { CurrentSession, type LiveInfo } from "./live/CurrentSession.tsx";
import { Loading } from "./Loading.tsx";
import { Settings } from "./Settings.tsx";
import { Stats } from "./stats/Stats.tsx";
import { Tabs } from "./Tabs.tsx";

const TABS = ["Countdown", "Stats", "Settings"] as const;
type Tab = (typeof TABS)[number];

const SLUG: Record<Tab, string> = { Countdown: "session", Stats: "stats", Settings: "settings" };

const fromHash = (): Tab =>
  TABS.find((t) => location.hash.slice(1).startsWith(SLUG[t])) ?? "Countdown";

export const App = () => {
  const [tab, setTab] = useState<Tab>(fromHash);
  const [visit, setVisit] = useState(0);
  const season = useJson<Season>("/api/season", 10 * 60_000);
  const info = useJson<LiveInfo>("/api/live", 30_000);
  useEffect(() => {
    const on = () => setTab(fromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  const go = (t: Tab) => {
    history.pushState(null, "", t === "Countdown" ? "/" : `#${SLUG[t]}`);
    setTab(t);
    setVisit((v) => v + 1);
  };
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <header className="flex items-center gap-4">
        <button onClick={() => go("Countdown")} className="text-2xl font-black tracking-tight text-red-500 italic">
          F1
        </button>
        <Tabs items={TABS} value={tab} onChange={go} labels={info.data?.live ? { Countdown: "Live" } : undefined} />
      </header>
      <main key={visit}>
        {tab === "Countdown" && <CurrentSession season={season} info={info} />}
        {tab === "Stats" &&
          (season.data ? <Stats season={season.data} /> : <Loading label="Loading the season…" error={season.error} />)}
        {tab === "Settings" && <Settings />}
      </main>
    </div>
  );
};
