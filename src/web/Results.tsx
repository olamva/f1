import { X } from "lucide-react";
import { useState } from "react";
import type { DriverProfile, RaceArchive } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Flag } from "./Flag.tsx";
import { Loading } from "./Loading.tsx";
import { pathPart } from "./path.ts";
import { Podium } from "./Podium.tsx";
import { Tabs } from "./Tabs.tsx";

const SESSIONS = ["sprint", "race"] as const;

const SprintMarker = () => (
  <span
    title="Sprint Weekend"
    className="inline-grid size-4 place-items-center rounded bg-zinc-700/60 align-middle text-[10px] font-bold text-zinc-400"
  >
    S
  </span>
);

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
          aria-label="Close"
          title="Close"
          className="cursor-pointer text-zinc-400 hover:text-white"
        >
          <X aria-hidden="true" className="size-5" />
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

interface ResultsTableProps {
  rows: RaceArchive["races"][number]["results"];
  onDriver: (id: string) => void;
}

const ResultsTable = ({ rows, onDriver }: ResultsTableProps) => (
  <table className="tabular w-full text-xs sm:text-sm">
    <thead className="text-left text-xs text-zinc-500">
      <tr>
        <th className="w-8 pb-2">Pos</th>
        <th className="pb-2">Driver</th>
        <th className="pb-2 pl-2">Team</th>
        <th className="pb-2 pl-2 text-right">Grid</th>
        <th className="pb-2 pl-2 text-right">Status</th>
        <th className="pb-2 pl-2 text-right">Pts</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((result, index) => {
        const status = result.status === "Finished" ? "" : result.status;
        return (
          <tr
            key={`${result.driver}:${index}`}
            className="relative border-t border-zinc-800 hover:bg-zinc-800/50"
          >
            <td className="py-2 font-semibold">{result.positionText}</td>
            <td className="py-2">
              <button
                type="button"
                onClick={() => onDriver(result.driver)}
                className="cursor-pointer text-left after:absolute after:inset-0"
              >
                <span
                  className="tabular mr-1.5 font-semibold sm:mr-2 sm:text-xs"
                  style={{ color: teamColor(result.team) }}
                >
                  {result.number}
                </span>
                {result.name}
              </button>
            </td>
            <td className="py-2 pl-2 text-zinc-400">{result.teamName}</td>
            <td className="py-2 pl-2 text-right text-zinc-400">
              {result.grid || "Pit"}
            </td>
            <td
              className="py-2 pl-2 text-right text-zinc-400 sm:max-w-40 sm:truncate"
              title={status}
            >
              {status}
            </td>
            <td className="py-2 pl-2 text-right font-semibold">
              {result.points || "–"}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export const Results = () => {
  const initialYear = pathPart("results");
  const [year, setYear] = useState(
    years.includes(initialYear ?? "") ? initialYear! : String(currentYear),
  );
  const [round, setRound] = useState(Number(location.pathname.split("/")[3]));
  const [driver, setDriver] = useState<string | null>(null);
  const [session, setSession] = useState<"race" | "sprint">("race");
  const archive = useJson<RaceArchive>(`/api/results/${year}`);
  const races = archive.data?.year === Number(year) ? archive.data.races : [];
  const race = races.find((entry) => entry.round === round) ?? races[0];
  const shown = race?.results.length ? session : "sprint";
  const rows = (shown === "sprint" ? race?.sprint : race?.results) ?? [];
  const choose = (nextYear: string, nextRound?: number) => {
    setYear(nextYear);
    setRound(nextRound ?? 0);
    setDriver(null);
    setSession("race");
    history.replaceState(
      null,
      "",
      `/results/${nextYear}${nextRound ? `/${nextRound}` : ""}`,
    );
  };

  const seasonSelect = (
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
  );

  return (
    <div className="space-y-4">
      {!race && <div className="flex justify-end">{seasonSelect}</div>}
      {archive.data?.year !== Number(year) ? (
        <Loading label="Loading race results…" error={archive.error} />
      ) : !race ? (
        <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
          No race results are available for {year}.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="bg-surface rounded-xl p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Races
              </h2>
              {seasonSelect}
            </div>
            <select
              aria-label="Race"
              value={race.round}
              onChange={(event) => choose(year, Number(event.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white lg:hidden"
            >
              {races.map((entry) => (
                <option key={entry.round} value={entry.round}>
                  {entry.round}. {entry.name}
                  {entry.sprint.length ? " (S)" : ""}
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
                  className={`flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800 ${race.round === entry.round ? "bg-red-700/25 text-white" : "text-zinc-400"}`}
                >
                  <span className="tabular mr-2 text-xs text-zinc-500">
                    {String(entry.round).padStart(2, "0")}
                  </span>
                  <Flag country={entry.country} />
                  {entry.name}
                  {entry.sprint.length > 0 && (
                    <span className="ml-auto pl-2">
                      <SprintMarker />
                    </span>
                  )}
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
            <section className="bg-surface overflow-x-auto rounded-xl p-3 sm:p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-400">
                    Round {race.round} · {race.date}
                  </p>
                  <h2 className="text-xl font-bold">
                    <Flag country={race.country} />
                    {race.name}
                  </h2>
                </div>
                {race.results.length > 0 && race.sprint.length > 0 && (
                  <div className="shrink-0">
                    <Tabs
                      items={SESSIONS}
                      value={shown}
                      onChange={setSession}
                      small
                    />
                  </div>
                )}
              </div>
              {rows.length >= 3 && (
                <Podium
                  key={`${race.round}:${shown}`}
                  entries={rows.map((result) => ({
                    id: result.driver,
                    name: result.name,
                    color: teamColor(result.team),
                    value: `${result.points} pts`,
                    detail: result.teamName,
                  }))}
                  crowned
                  onSelect={setDriver}
                />
              )}
              <ResultsTable rows={rows} onDriver={setDriver} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
