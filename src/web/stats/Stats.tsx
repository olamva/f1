import { ChartLine, Gauge, IdCard, Swords, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Championship } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { pathPart, pathSegment, setPathPart } from "../path.ts";
import { Swipe } from "../Swipe.tsx";
import { Tabs } from "../Tabs.tsx";
import {
  driverTables,
  drivers,
  duels,
  gains,
  latest,
  remaining,
  teamTables,
  teams,
} from "./derive.ts";
import { DriverProfile } from "./DriverProfile.tsx";
import { Drivers } from "./Drivers.tsx";
import { RacePace } from "./RacePace.tsx";
import { SeasonCharts } from "./SeasonCharts.tsx";
import { Teammates } from "./Teammates.tsx";
import { TitleFight } from "./TitleFight.tsx";

const VIEWS = ["Drivers", "Title fight", "H2H", "Season", "Race pace"] as const;
type View = (typeof VIEWS)[number];
const CHAMPS = ["drivers", "constructors"] as const;

const ICONS = {
  Drivers: IdCard,
  "Title fight": Swords,
  H2H: Users,
  Season: ChartLine,
  "Race pace": Gauge,
};

const slug = (v: View) => v.toLowerCase().replace(" ", "-");

interface StatsProps {
  season: Season;
}

export const Stats = ({ season }: StatsProps) => {
  const [view, setView] = useState<View>(
    () => VIEWS.find((v) => slug(v) === pathPart("stats")) ?? "Drivers",
  );
  const [driver, setDriver] = useState(() =>
    view === "Drivers" ? pathSegment("stats", 3) : null,
  );
  const show = (v: View) => {
    setPathPart("stats", slug(v));
    setView(v);
    setDriver(null);
  };
  const [champ, setChamp] = useState<Championship>("drivers");
  const viewBlob = useRef<(offset: number, held: boolean) => void>(null);
  const champBlob = useRef<(offset: number, held: boolean) => void>(null);
  const d = useMemo(() => {
    const dt = driverTables(season);
    const tt = teamTables(season);
    return {
      who: drivers(season),
      teamWho: teams(season),
      dt,
      tt,
      events: remaining(season),
      duels: duels(season),
      gains: gains(season),
    };
  }, [season]);
  return (
    <div className="space-y-4">
      <Tabs
        items={VIEWS}
        value={view}
        onChange={show}
        icons={ICONS}
        small
        stretch
        drive={viewBlob}
      />
      <Swipe
        items={VIEWS}
        value={view}
        onChange={show}
        drive={viewBlob}
        render={(v) => (
          <>
            {v === "Drivers" &&
              (driver ? (
                <DriverProfile
                  key={driver}
                  id={driver}
                  onBack={() => show("Drivers")}
                />
              ) : (
                <Drivers season={season} who={d.who} table={latest(d.dt)} />
              ))}
            {v === "Title fight" && (
              <div className="space-y-4">
                <Tabs
                  items={CHAMPS}
                  value={champ}
                  onChange={setChamp}
                  small
                  stretch
                  drive={champBlob}
                />
                <Swipe
                  items={CHAMPS}
                  value={champ}
                  onChange={setChamp}
                  drive={champBlob}
                  render={(c) => (
                    <TitleFight
                      champ={c}
                      table={latest(c === "drivers" ? d.dt : d.tt)}
                      events={d.events}
                      who={c === "drivers" ? d.who : d.teamWho}
                    />
                  )}
                />
              </div>
            )}
            {v === "H2H" && (
              <Teammates
                duels={d.duels}
                who={d.who}
                hasSprints={
                  season.sprints.length > 0 ||
                  season.sprintQualifying.length > 0
                }
                hasSprintQualifying={season.sprintQualifying.length > 0}
              />
            )}
            {v === "Season" && (
              <SeasonCharts tables={d.dt} who={d.who} gains={d.gains} />
            )}
            {v === "Race pace" && <RacePace season={season} who={d.who} />}
          </>
        )}
      />
    </div>
  );
};
