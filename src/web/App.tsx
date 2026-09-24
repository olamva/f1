import { useEffect, useState } from "react";
import type { Season } from "../shared/season.ts";
import { useJson } from "./api.ts";
import { CurrentSession } from "./live/CurrentSession.tsx";
import { Settings } from "./Settings.tsx";
import { Stats } from "./stats/Stats.tsx";
import { Tabs } from "./Tabs.tsx";

const TABS = ["Current Session", "Stats", "Settings"] as const;
type Tab = (typeof TABS)[number];

const SLUG: Record<Tab, string> = { "Current Session": "session", Stats: "stats", Settings: "settings" };

const fromHash = (): Tab =>
  TABS.find((t) => location.hash.slice(1).startsWith(SLUG[t])) ?? "Current Session";

export const App = () => {
  const [tab, setTab] = useState<Tab>(fromHash);
  const season = useJson<Season>("/api/season", 10 * 60_000);
  useEffect(() => {
    const on = () => setTab(fromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  const go = (t: Tab) => {
    location.hash = SLUG[t];
    setTab(t);
  };
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <header className="flex items-center gap-4">
        <span className="text-2xl font-black tracking-tight text-red-500 italic">F1</span>
        <Tabs items={TABS} value={tab} onChange={go} />
      </header>
      <main>
        {tab === "Current Session" && <CurrentSession season={season.data} />}
        {tab === "Stats" &&
          (season.data ? <Stats season={season.data} /> : <p className="text-zinc-400">{season.error ?? "Loading the season…"}</p>)}
        {tab === "Settings" && <Settings />}
      </main>
    </div>
  );
};
