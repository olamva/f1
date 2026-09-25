import { useState } from "react";
import type { DriverProfile, RaceArchive } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Flag } from "./Flag.tsx";
import { Loading } from "./Loading.tsx";
import { pathPart } from "./path.ts";

const currentYear = new Date().getUTCFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, index) =>
  String(currentYear - index),
);

interface ProfileProps {
  id: string;
  onClose: () => void;
}

const Profile = ({ id, onClose }: ProfileProps) => {
  const { data, error } = useJson<DriverProfile>(`/api/drivers/${id}`);
  return (
    <section className="bg-surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Driver profile</h3>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-sm text-zinc-400 hover:text-white"
        >
          Close
        </button>
      </div>
      {!data ? (
        <Loading label="Loading driver…" error={error} />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
            <div>
              <p className="text-2xl font-bold">{data.name}</p>
              <p className="text-sm text-zinc-400">
                {[
                  data.nationality,
                  data.dateOfBirth,
                  data.number && `#${data.number}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-400 hover:text-red-300"
              >
                Biography ↗
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
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
                className="rounded-lg bg-zinc-800/70 p-3"
              >
                <p className="text-xs text-zinc-400">{label}</p>
                <p className="tabular text-xl font-bold">{value ?? "—"}</p>
              </div>
            ))}
          </div>
          {data.firstSeason && (
            <p className="text-sm text-zinc-400">
              Race years: {data.firstSeason}
              {data.firstSeason === data.lastSeason
                ? ""
                : `–${data.lastSeason}`}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export const Results = () => {
  const initialYear = pathPart("results");
  const [year, setYear] = useState(
    years.includes(initialYear ?? "") ? initialYear! : String(currentYear),
  );
  const [round, setRound] = useState(Number(location.pathname.split("/")[3]));
  const [driver, setDriver] = useState<string | null>(null);
  const archive = useJson<RaceArchive>(`/api/results/${year}`);
  const races = archive.data?.year === Number(year) ? archive.data.races : [];
  const race = races.find((entry) => entry.round === round) ?? races[0];
  const choose = (nextYear: string, nextRound?: number) => {
    setYear(nextYear);
    setRound(nextRound ?? 0);
    setDriver(null);
    history.replaceState(
      null,
      "",
      `/results/${nextYear}${nextRound ? `/${nextRound}` : ""}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-red-400 uppercase">
            Race archive
          </p>
          <h1 className="text-2xl font-bold">Results</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Season
          <select
            aria-label="Season"
            value={year}
            onChange={(event) => choose(event.target.value)}
            className="bg-surface rounded-lg border border-zinc-700 px-3 py-2 text-white"
          >
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {archive.data?.year !== Number(year) ? (
        <Loading label="Loading race results…" error={archive.error} />
      ) : !race ? (
        <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
          No race results are available for {year}.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="bg-surface rounded-xl p-3">
            <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Races
            </h2>
            <select
              aria-label="Race"
              value={race.round}
              onChange={(event) => choose(year, Number(event.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white lg:hidden"
            >
              {races.map((entry) => (
                <option key={entry.round} value={entry.round}>
                  {entry.round}. {entry.name}
                </option>
              ))}
            </select>
            <div className="hidden max-h-[70vh] space-y-1 overflow-y-auto lg:block">
              {races.map((entry) => (
                <button
                  key={entry.round}
                  type="button"
                  onClick={() => choose(year, entry.round)}
                  aria-pressed={race.round === entry.round}
                  className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800 ${race.round === entry.round ? "bg-red-700/25 text-white" : "text-zinc-400"}`}
                >
                  <span className="tabular mr-2 text-xs text-zinc-500">
                    {String(entry.round).padStart(2, "0")}
                  </span>
                  <Flag country={entry.country} />
                  {entry.name}
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0 space-y-4">
            {driver && (
              <Profile
                key={driver}
                id={driver}
                onClose={() => setDriver(null)}
              />
            )}
            <section className="bg-surface overflow-x-auto rounded-xl p-4">
              <div className="mb-4">
                <p className="text-xs text-zinc-400">
                  Round {race.round} · {race.date}
                </p>
                <h2 className="text-xl font-bold">
                  <Flag country={race.country} />
                  {race.name}
                </h2>
              </div>
              <table className="tabular w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="w-8 pb-2">Pos</th>
                    <th className="pb-2 pl-3 sm:pl-0">Driver</th>
                    <th className="hidden pb-2 sm:table-cell">Team</th>
                    <th className="hidden pb-2 text-right sm:table-cell">
                      Grid
                    </th>
                    <th className="hidden pb-2 text-right sm:table-cell">
                      Pts
                    </th>
                    <th className="hidden pb-2 text-right sm:table-cell">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {race.results.map((result, index) => (
                    <tr
                      key={`${result.driver}:${index}`}
                      className="border-t border-zinc-800"
                    >
                      <td className="py-2 font-semibold">
                        {result.positionText}
                      </td>
                      <td className="py-2 pl-3 sm:pl-0">
                        <button
                          type="button"
                          onClick={() => setDriver(result.driver)}
                          className="cursor-pointer text-left hover:text-red-400"
                        >
                          <span className="block">
                            <span
                              className="mr-2 inline-block h-4 w-1 rounded-sm align-middle"
                              style={{ background: teamColor(result.team) }}
                            />
                            <span className="tabular mr-2 text-xs text-zinc-500">
                              {result.number}
                            </span>
                            {result.name}
                          </span>
                          <span className="mt-1 block text-xs text-zinc-500 sm:hidden">
                            {result.teamName} · Grid {result.grid || "Pit"} ·{" "}
                            {result.points} pts · {result.status}
                          </span>
                        </button>
                      </td>
                      <td className="hidden py-2 pr-3 text-zinc-400 sm:table-cell">
                        {result.teamName}
                      </td>
                      <td className="hidden py-2 text-right text-zinc-400 sm:table-cell">
                        {result.grid || "Pit"}
                      </td>
                      <td className="hidden py-2 text-right font-semibold sm:table-cell">
                        {result.points || "–"}
                      </td>
                      <td
                        className="hidden max-w-40 truncate py-2 pl-3 text-right text-zinc-400 sm:table-cell"
                        title={result.status}
                      >
                        {result.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
