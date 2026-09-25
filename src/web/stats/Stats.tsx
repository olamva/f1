import { useMemo, useState } from "react";
import type { Championship } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { hashPart, setHashPart } from "../hash.ts";
import { Tabs } from "../Tabs.tsx";
import {
  driverTables,
  drivers,
  duels,
  gains,
  latest,
  remaining,
  seasonRecords,
  teamTables,
  teams,
} from "./derive.ts";
import { RacePace } from "./RacePace.tsx";
import { Records } from "./Records.tsx";
import { SeasonCharts } from "./SeasonCharts.tsx";
import { StandingsTable } from "./Standings.tsx";
import { Teammates } from "./Teammates.tsx";
import { TitleFight } from "./TitleFight.tsx";

const VIEWS = [
  "Standings",
  "Title fight",
  "Teammates",
  "Season",
  "Race pace",
  "Records",
] as const;
type View = (typeof VIEWS)[number];

const slug = (v: View) => v.toLowerCase().replace(" ", "-");

interface StatsProps {
  season: Season;
}

export const Stats = ({ season }: StatsProps) => {
  const [view, setView] = useState<View>(() => VIEWS.find((v) => slug(v) === hashPart("stats")) ?? "Standings");
  const show = (v: View) => {
    setHashPart("stats", slug(v));
    setView(v);
  };
  const [champ, setChamp] = useState<Championship>("drivers");
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
      records: seasonRecords(season),
    };
  }, [season]);
  return (
    <div className="space-y-4">
      <Tabs items={VIEWS} value={view} onChange={show} small />
      {view === "Standings" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <StandingsTable title="Drivers" table={latest(d.dt)} who={d.who} />
          <StandingsTable
            title="Constructors"
            table={latest(d.tt)}
            who={d.teamWho}
          />
        </div>
      )}
      {view === "Title fight" && (
        <>
          <Tabs
            items={["drivers", "constructors"] as const}
            value={champ}
            onChange={setChamp}
            small
          />
          <TitleFight
            key={champ}
            champ={champ}
            table={latest(champ === "drivers" ? d.dt : d.tt)}
            events={d.events}
            who={champ === "drivers" ? d.who : d.teamWho}
          />
        </>
      )}
      {view === "Teammates" && (
        <Teammates
          duels={d.duels}
          who={d.who}
          hasSprints={season.sprints.length > 0}
          hasSprintQualifying={season.sprintQualifying.length > 0}
        />
      )}
      {view === "Season" && (
        <SeasonCharts tables={d.dt} who={d.who} gains={d.gains} />
      )}
      {view === "Race pace" && <RacePace season={season} who={d.who} />}
      {view === "Records" && (
        <Records
          rows={d.records}
          who={d.who}
          hasSprints={season.sprints.length > 0}
        />
      )}
    </div>
  );
};
