import { useState } from "react";
import type { RaceArchive, Season } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { Flag } from "./Flag.tsx";
import { Loading } from "./Loading.tsx";
import { openDriver, pathPart, pathSegment } from "./path.ts";
import { Podium } from "./Podium.tsx";
import { Standings } from "./Standings.tsx";
import { TeamLogo } from "./TeamLogo.tsx";
import { Tabs } from "./Tabs.tsx";

const SESSIONS = ["sprint", "race"] as const;
const PARTS = ["Races", "Standings"] as const;
type Part = (typeof PARTS)[number];

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

interface ResultsTableProps {
  rows: RaceArchive["races"][number]["results"];
}

const ResultsTable = ({ rows }: ResultsTableProps) => (
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
      {(rows.length >= 3 ? rows.slice(3) : rows).map((result, index) => {
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
                onClick={() => openDriver(result.driver)}
                className="cursor-pointer text-left after:absolute after:inset-0"
              >
                <TeamLogo
                  team={result.team}
                  className="mr-1.5 inline h-4 w-6 align-[-3px] sm:mr-2"
                />
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

const resultsPath = (year: string, part: Part, round: number) =>
  `/results/${year}${part === "Standings" ? "/standings" : round ? `/${round}` : ""}`;

interface RacesProps {
  year: string;
  round: number;
  onRound: (round: number) => void;
}

const Races = ({ year, round, onRound }: RacesProps) => {
  const [session, setSession] = useState<"race" | "sprint">("race");
  const archive = useJson<RaceArchive>(`/api/results/${year}`);
  const races = archive.data?.year === Number(year) ? archive.data.races : [];
  const race = races.find((entry) => entry.round === round) ?? races[0];
  const shown = race?.results.length ? session : "sprint";
  const rows = (shown === "sprint" ? race?.sprint : race?.results) ?? [];
  const choose = (nextRound: number) => {
    setSession("race");
    onRound(nextRound);
  };
  if (archive.data?.year !== Number(year))
    return <Loading label="Loading race results…" error={archive.error} />;
  if (!race)
    return (
      <p className="bg-surface rounded-xl p-4 text-sm text-zinc-400">
        No race results are available for {year}.
      </p>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="bg-surface rounded-xl p-3">
        <select
          aria-label="Race"
          value={race.round}
          onChange={(event) => choose(Number(event.target.value))}
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
              onClick={() => choose(entry.round)}
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
      <section className="bg-surface min-w-0 overflow-x-auto rounded-xl p-3 sm:p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400">
              Round {race.round} · {race.date}
            </p>
            <h2 className="font-f1 text-xl font-bold">
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
            onSelect={openDriver}
          />
        )}
        <ResultsTable rows={rows} />
      </section>
    </div>
  );
};

interface ResultsProps {
  season: Season | null;
}

export const Results = ({ season }: ResultsProps) => {
  const initialYear = pathPart("results");
  const [year, setYear] = useState(
    years.includes(initialYear ?? "") ? initialYear! : String(currentYear),
  );
  const [part, setPart] = useState<Part>(
    pathSegment("results", 3) === "standings" ? "Standings" : "Races",
  );
  const [round, setRound] = useState(Number(pathSegment("results", 3)));
  const show = (nextYear: string, nextPart: Part, nextRound = 0) => {
    setYear(nextYear);
    setPart(nextPart);
    setRound(nextRound);
    history.replaceState(null, "", resultsPath(nextYear, nextPart, nextRound));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs
          items={PARTS}
          value={part}
          onChange={(nextPart) => show(year, nextPart)}
          small
        />
        <select
          aria-label="Season"
          value={year}
          onChange={(event) => show(event.target.value, part)}
          className="bg-surface rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white"
        >
          {years.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {part === "Standings" ? (
        <Standings key={year} year={year} season={season} />
      ) : (
        <Races
          key={year}
          year={year}
          round={round}
          onRound={(nextRound) => show(year, "Races", nextRound)}
        />
      )}
    </div>
  );
};
