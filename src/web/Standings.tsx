import { useState } from "react";
import type { Championship } from "../shared/clinch.ts";
import type { Season, SeasonStandings, StandingRow } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Loading } from "./Loading.tsx";
import { openDriver } from "./path.ts";
import { Podium } from "./Podium.tsx";
import { clinched } from "./stats/derive.ts";
import { Tabs } from "./Tabs.tsx";

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
                <span
                  className="h-4 w-1 rounded-sm"
                  style={{ background: teamColor(row.team) }}
                />
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
  return (
    <div className="space-y-4">
      {teams && (
        <div className="xl:hidden">
          <Tabs
            items={["drivers", "constructors"] as const}
            value={champ}
            onChange={setChamp}
            small
            stretch
          />
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className={champ === "drivers" ? undefined : "max-xl:hidden"}>
          <StandingsTable
            title="Drivers"
            rows={data.drivers}
            crowned={crowned("drivers")}
            onSelect={openDriver}
          />
        </div>
        {teams && (
          <div
            className={champ === "constructors" ? undefined : "max-xl:hidden"}
          >
            <StandingsTable
              title="Constructors"
              rows={data.constructors}
              crowned={crowned("constructors")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
