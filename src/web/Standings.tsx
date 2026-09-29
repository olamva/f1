import { useRef, useState } from "react";
import type { Championship } from "../shared/clinch.ts";
import type { Season, SeasonStandings, StandingRow } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Loading } from "./Loading.tsx";
import { openDriver } from "./path.ts";
import { Podium } from "./Podium.tsx";
import { clinched } from "./stats/derive.ts";
import { TeamLogo } from "./TeamLogo.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";

const CHAMPS = ["drivers", "constructors"] as const;

interface StandingsTableProps {
  title: string;
  rows: StandingRow[];
  crowned: boolean;
  onSelect?: (id: string) => void;
}

const StandingsTable = ({
  title,
  rows,
  crowned,
  onSelect,
}: StandingsTableProps) => {
  const lead = rows[0]?.points ?? 0;
  const start = rows.length >= 3 ? 3 : 0;
  return (
    <section className="bg-surface rounded-xl p-3">
      <h2 className="font-f1 mb-2 hidden text-xs tracking-wider text-zinc-400 uppercase xl:block">
        {title}
      </h2>
      {rows.length >= 3 && (
        <Podium
          entries={rows.map((row) => ({
            id: row.id,
            name: row.name,
            color: teamColor(row.team),
            value: `${row.points} pts`,
          }))}
          crowned={crowned}
          onSelect={onSelect}
        />
      )}
      <table className="tabular w-full text-sm">
        <tbody>
          {rows.slice(start).map((row, index) => {
            const i = start + index;
            const name = (
              <span className="flex items-center gap-2">
                <TeamLogo team={row.team} className="h-4 w-6" />
                {row.name}
              </span>
            );
            return (
              <tr
                key={row.id}
                className={`border-t border-zinc-800 ${onSelect ? "relative hover:bg-zinc-800/50" : ""}`}
              >
                <td className="w-8 py-1 text-right text-zinc-500">
                  {["🥇", "🥈", "🥉"][i] ?? i + 1}
                </td>
                <td className="px-3 py-1">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className="cursor-pointer text-left after:absolute after:inset-0"
                    >
                      {name}
                    </button>
                  ) : (
                    name
                  )}
                </td>
                <td className="py-1 text-right font-semibold">{row.points}</td>
                <td className="w-16 py-1 text-right text-zinc-500">
                  {i ? `-${lead - row.points}` : ""}
                </td>
                <td className="w-16 py-1 text-right text-zinc-500">
                  {row.wins ? (
                    <span aria-label={`${row.wins} wins`}>{row.wins} 🏆</span>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

interface StandingsProps {
  year: string;
  season: Season | null;
}

export const Standings = ({ year, season }: StandingsProps) => {
  const [champ, setChamp] = useState<Championship>("drivers");
  const blob = useRef<(offset: number, held: boolean) => void>(null);
  const { data, error } = useJson<SeasonStandings>(`/api/standings/${year}`);
  if (data?.year !== Number(year))
    return <Loading label="Loading standings…" error={error} />;
  if (!data.drivers.length)
    return (
      <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
        No standings are available for {year}.
      </p>
    );
  const teams = data.constructors.length > 0;
  const crowned = (champ: Championship) =>
    Number(year) < new Date().getUTCFullYear() ||
    (season?.year === data.year && clinched(season, champ));
  const table = (champ: Championship) =>
    champ === "drivers" ? (
      <StandingsTable
        title="Drivers"
        rows={data.drivers}
        crowned={crowned("drivers")}
        onSelect={openDriver}
      />
    ) : (
      <StandingsTable
        title="Constructors"
        rows={data.constructors}
        crowned={crowned("constructors")}
      />
    );
  return (
    <div className="space-y-4">
      {teams && (
        <div className="xl:hidden">
          <Tabs
            items={CHAMPS}
            value={champ}
            onChange={setChamp}
            small
            stretch
            drive={blob}
          />
        </div>
      )}
      <div className="xl:hidden">
        <Swipe
          items={teams ? CHAMPS : CHAMPS.slice(0, 1)}
          value={teams ? champ : "drivers"}
          onChange={setChamp}
          drive={blob}
          render={table}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 max-xl:hidden">
        {table("drivers")}
        {teams && table("constructors")}
      </div>
    </div>
  );
};
