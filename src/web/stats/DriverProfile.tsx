import { ArrowLeft } from "lucide-react";
import type {
  Classified,
  DriverProfile as Profile,
  Season,
} from "../../shared/season.ts";
import { teamColor } from "../../shared/teams.ts";
import { useJson } from "../api.ts";
import { Flag } from "../Flag.tsx";
import { Loading } from "../Loading.tsx";
import { METALS } from "../Podium.tsx";
import { TeamNumber } from "./TeamNumber.tsx";

const SHORT: Record<string, string> = {
  "Did not start": "DNS",
  Disqualified: "DSQ",
};

interface PlaceProps {
  result: Classified | undefined;
  sprint: boolean;
}

const Place = ({ result, sprint }: PlaceProps) => (
  <span
    className={`font-f1 font-bold ${sprint ? "text-[10px]" : "text-sm"} ${result?.points ? "" : "text-zinc-500"}`}
    style={{ color: METALS[(result?.position ?? 0) - 1] }}
  >
    {sprint && <span className="mr-0.5 text-zinc-500">S</span>}
    {result ? (result.position ?? SHORT[result.status] ?? "DNF") : "–"}
  </span>
);

interface SeasonResultsProps {
  id: string;
  season: Season;
}

const SeasonResults = ({ id, season }: SeasonResultsProps) => {
  const weekends = season.rounds
    .map((round) => ({
      round,
      sessions: (
        [
          ["Race", season.races],
          ["Sprint", season.sprints],
        ] as const
      ).flatMap(([name, all]) => {
        const rows = all.find((s) => s.round === round.round)?.results;
        return rows
          ? [{ name, result: rows.find((r) => r.driver === id) }]
          : [];
      }),
    }))
    .filter((weekend) => weekend.sessions.length);
  if (!weekends.some((weekend) => weekend.sessions.some((s) => s.result)))
    return null;
  return (
    <section className="bg-surface rounded-xl p-3 sm:p-4">
      <h3 className="font-f1 mb-2 text-xs tracking-wider text-zinc-400 uppercase">
        {season.year} results
      </h3>
      <ol className="tabular grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
        {weekends.map(({ round, sessions }) => (
          <li
            key={round.round}
            title={[
              round.name,
              ...sessions.map(
                (s) => `${s.name}: ${s.result?.status ?? "Did not race"}`,
              ),
            ].join("\n")}
            className="flex flex-col items-center gap-0.5 rounded-md bg-zinc-800/60 py-1.5 *:mr-0"
          >
            <Flag country={round.country} />
            {sessions.map((s) => (
              <Place
                key={s.name}
                result={s.result}
                sprint={s.name === "Sprint"}
              />
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
};

interface DriverProfileProps {
  id: string;
  season: Season;
  onBack: () => void;
}

export const DriverProfile = ({ id, season, onBack }: DriverProfileProps) => {
  const { data, error } = useJson<Profile>(`/api/drivers/${id}`);
  const color = teamColor(data?.seasons[0]?.team ?? "");
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All drivers
      </button>
      {!data ? (
        <Loading label="Loading driver…" error={error} />
      ) : (
        <>
          <section
            className="bg-surface relative overflow-hidden rounded-xl p-5 sm:p-6"
            style={{
              backgroundImage: `linear-gradient(135deg, ${color}40, transparent 60%)`,
            }}
          >
            {data.number && (
              <TeamNumber
                id={data.id}
                number={data.number}
                color={color}
                className="absolute top-5 right-5 flex h-16 items-start text-[4rem] opacity-30 sm:h-24 sm:text-[6rem]"
              />
            )}
            <div className="relative">
              <p className="text-sm text-zinc-400">
                {data.seasons[0]?.teamName}
              </p>
              <h2 className="font-f1 text-3xl font-bold sm:text-4xl">
                {data.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {[
                  data.nationality,
                  data.dateOfBirth,
                  data.firstSeason &&
                    (data.firstSeason === data.lastSeason
                      ? `${data.firstSeason}`
                      : `${data.firstSeason}–${data.lastSeason}`),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {data.url && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-zinc-300 underline decoration-zinc-500 underline-offset-4 hover:text-white hover:decoration-white"
                >
                  Biography ↗
                </a>
              )}
            </div>
            <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["Seasons", data.seasons.length],
                  ["Starts", data.starts],
                  ["Wins", data.wins],
                  ["Podiums", data.podiums],
                  ["Poles", data.poles],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  title={
                    label === "Poles" && value === null
                      ? "Qualifying data is incomplete for this driver."
                      : undefined
                  }
                  className="rounded-lg bg-zinc-800/60 p-3"
                >
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="tabular font-f1 text-2xl font-bold">
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <SeasonResults id={id} season={season} />
          <section className="bg-surface overflow-x-auto rounded-xl p-3 sm:p-4">
            <h3 className="font-f1 mb-2 text-xs tracking-wider text-zinc-400 uppercase">
              Seasons
            </h3>
            <table className="tabular w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-2 text-left">Season</th>
                  <th className="pb-2 pl-3 text-left">Team</th>
                  <th className="pb-2 pl-3 text-right">Starts</th>
                  <th className="pb-2 pl-3 text-right">Wins</th>
                  <th className="pb-2 pl-3 text-right">Podiums</th>
                  <th className="pb-2 pl-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.seasons.map((season) => (
                  <tr key={season.year} className="border-t border-zinc-800">
                    <td className="py-1.5 font-semibold">{season.year}</td>
                    <td className="py-1.5 pl-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-4 w-1 shrink-0 rounded-sm"
                          style={{ background: teamColor(season.team) }}
                        />
                        {season.teamName}
                      </span>
                    </td>
                    <td className="py-1.5 pl-3 text-right">{season.starts}</td>
                    <td className="py-1.5 pl-3 text-right">
                      {season.wins || ""}
                    </td>
                    <td className="py-1.5 pl-3 text-right">
                      {season.podiums || ""}
                    </td>
                    <td className="py-1.5 pl-3 text-right font-semibold">
                      {season.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
};
