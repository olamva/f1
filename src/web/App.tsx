import { Fragment, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  Settings as SettingsIcon,
  Timer,
  Trophy,
} from "lucide-react";
import type { Season } from "../shared/season.ts";
import { useJson } from "./api.ts";
import {
  Calendar,
  LiveSession,
  type LiveInfo,
} from "./live/CurrentSession.tsx";
import { Loading } from "./Loading.tsx";
import { navigate } from "./path.ts";
import { Results } from "./Results.tsx";
import { Settings } from "./Settings.tsx";
import { Stats } from "./stats/Stats.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";
import { UpdateToast } from "./UpdateToast.tsx";
import f1Logo from "./f1-logo.svg";

const TABS = ["Countdown", "Calendar", "Results", "Stats", "Settings"] as const;
type Tab = (typeof TABS)[number];

const SLUG: Record<Tab, string> = {
  Countdown: "session",
  Calendar: "calendar",
  Results: "results",
  Stats: "stats",
  Settings: "settings",
};

const ICONS = {
  Countdown: Timer,
  Calendar: CalendarDays,
  Results: Trophy,
  Stats: ChartColumn,
  Settings: SettingsIcon,
};

const fromPath = (): Tab =>
  TABS.find((t) => location.pathname.slice(1).startsWith(SLUG[t])) ??
  "Countdown";

export const App = () => {
  const [tab, setTab] = useState<Tab>(fromPath);
  const [visit, setVisit] = useState(0);
  const [session, setSession] = useState(0);
  const blob = useRef<(offset: number, held: boolean) => void>(null);
  const logo = useRef<HTMLButtonElement>(null);
  const season = useJson<Season>("/api/season", 10 * 60_000);
  const info = useJson<LiveInfo>("/api/live", 30_000);
  useEffect(() => {
    const on = () => {
      setTab(fromPath());
      setVisit((v) => v + 1);
    };
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.tab = tab;
  }, [tab]);
  const go = (t: Tab) => {
    if (tab === "Calendar" && t !== "Calendar") scrollTo(0, 0);
    navigate(t === "Countdown" ? "/" : `/${SLUG[t]}`);
    if (t === "Countdown" && tab === "Countdown") setSession((s) => s + 1);
    if (t === tab) setVisit((v) => v + 1);
    setTab(t);
  };
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 overflow-x-clip p-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-24 sm:pb-4 [&>.swipe]:grow [@media(display-mode:standalone)]:pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <header className="flex flex-wrap items-center gap-1.5 sm:h-13.5">
        <button
          ref={logo}
          onClick={() => go("Countdown")}
          className="relative z-10 flex cursor-pointer items-center gap-3 rounded-md sm:gap-3.5"
          aria-label="Go to live session"
          type="button"
        >
          <img src={f1Logo} alt="F1" className="w-16 sm:w-20" />
          <span className="h-6 w-px bg-zinc-600 sm:h-7" />
          <span className="font-f1 text-[22px] leading-none font-black tracking-wide text-white italic sm:text-[27px]">
            PITWALL
          </span>
        </button>
        <div className="fixed inset-x-[21px] bottom-[21px] z-20 flex justify-center sm:pointer-events-none sm:inset-x-4 sm:top-[calc(env(safe-area-inset-top)+1.5rem)] sm:bottom-auto sm:justify-end sm:in-has-[main:not([inert])_.board]:absolute xl:justify-center max-sm:[&>nav]:h-[62px] max-sm:[&>nav]:w-full max-sm:[&>nav]:bg-zinc-900/80 max-sm:[&>nav]:backdrop-blur-xl sm:[&>nav]:pointer-events-auto max-sm:[&>nav>button]:flex-1">
          <Tabs
            items={TABS}
            value={tab}
            onChange={go}
            onReselect={() =>
              scrollY > 0 ? scrollTo({ top: 0, behavior: "smooth" }) : go(tab)
            }
            icons={ICONS}
            labels={info.data?.live ? { Countdown: "Live" } : undefined}
            live={info.data?.live ? "Countdown" : undefined}
            drive={blob}
          />
        </div>
      </header>
      <Swipe
        items={TABS}
        value={tab}
        onChange={go}
        keep={["Countdown"]}
        drive={blob}
        lift={logo}
        render={(t) =>
          t === "Countdown" ? (
            <LiveSession key={session} season={season} info={info} />
          ) : (
            <Fragment key={visit}>
              {t === "Calendar" && <Calendar season={season} />}
              {t === "Results" && <Results season={season.data} />}
              {t === "Stats" &&
                (season.data ? (
                  <Stats season={season.data} />
                ) : (
                  <Loading label="Loading the season…" error={season.error} />
                ))}
              {t === "Settings" && <Settings />}
            </Fragment>
          )
        }
      />
      <UpdateToast />
    </div>
  );
};
