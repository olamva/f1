import { useRef, useState } from "react";
import { SESSION_MS, type RaceArchive, type Season } from "../shared/season.ts";
import { useJson } from "./api.ts";
import { useFavourite } from "./favourite.ts";
import { Flag } from "./Flag.tsx";
import { Loading } from "./Loading.tsx";
import { pathPart, pathSegment } from "./path.ts";
import { SESSIONS, SessionResults, type Kind } from "./SessionResults.tsx";
import { Spoiler } from "./Spoiler.tsx";
import { Standings } from "./Standings.tsx";
import { Swipe } from "./Swipe.tsx";
import { Tabs } from "./Tabs.tsx";

const LABELS = {
  fp1: "FP1",
  fp2: "FP2",
  fp3: "FP3",
  sprintQualifying: "SQ",
  qualifying: "Quali",
};
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

const resultsPath = (year: string, part: Part, round: number) =>
  `/results/${year}${part === "Standings" ? "/standings" : round ? `/${round}` : ""}`;

interface RacesProps {
  year: string;
  season: Season | null;
  round: number;
  onRound: (round: number) => void;
}

const Races = ({ year, season, round, onRound }: RacesProps) => {
  const [session, setSession] = useState<Kind>("race");
  const favourite = useFavourite();
  const archive = useJson<RaceArchive>(`/api/results/${year}`);
  const races = archive.data?.year === Number(year) ? archive.data.races : [];
  const race = races.find((entry) => entry.round === round) ?? races[0];
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
  const archived = Number(year) >= 2018;
  const times =
    season?.year === Number(year)
      ? season.rounds.find((entry) => entry.round === race.round)?.sessions
      : undefined;
  const sprint = race.sprint.length > 0 || !!times?.sprint;
  const available: Record<Kind, boolean> = {
    fp1: archived,
    fp2: archived && !(sprint && Number(year) >= 2023),
    fp3: archived && !sprint,
    sprintQualifying: sprint && Number(year) >= 2023,
    sprint: race.sprint.length > 0,
    qualifying: archived,
    race: race.results.length > 0,
  };
  const sessions = SESSIONS.filter(
    (kind) =>
      available[kind] &&
      !(Date.parse(times?.[kind] ?? "") + SESSION_MS > Date.now()),
  );
  const shown = sessions.includes(session) ? session : sessions.at(-1)!;
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="bg-surface rounded-xl p-3">
        <select
          aria-label="Race"
          value={race.round}
          onChange={(event) => choose(Number(event.target.value))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 lg:hidden"
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
              className={`flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800 ${race.round === entry.round ? "bg-red-700/25 text-zinc-50" : "text-zinc-400"}`}
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div>
            <p className="text-xs text-zinc-400">
              Round {race.round} · {race.date}
            </p>
            <h2 className="font-f1 text-xl font-bold">
              <Flag country={race.country} />
              {race.name}
            </h2>
          </div>
          {sessions.length > 1 && (
            <div className="shrink-0">
              <Tabs
                items={sessions}
                value={shown}
                onChange={setSession}
                labels={LABELS}
                small
              />
            </div>
          )}
        </div>
        <Spoiler
          season={season}
          year={Number(year)}
          kinds={[shown]}
          round={race.round}
        >
          <SessionResults
            year={year}
            race={race}
            races={races}
            kind={shown}
            favourite={favourite?.id}
          />
        </Spoiler>
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
  const blob = useRef<(offset: number, held: boolean) => void>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs
          items={PARTS}
          value={part}
          onChange={(nextPart) => show(year, nextPart)}
          small
          drive={blob}
        />
        <select
          aria-label="Season"
          value={year}
          onChange={(event) => show(event.target.value, part)}
          className="bg-surface rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-50"
        >
          {years.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <Swipe
        items={PARTS}
        value={part}
        onChange={(nextPart) => show(year, nextPart)}
        drive={blob}
        render={(p) =>
          p === "Standings" ? (
            <Spoiler
              key={year}
              season={season}
              year={Number(year)}
              kinds={["sprint", "race"]}
            >
              <Standings year={year} season={season} />
            </Spoiler>
          ) : (
            <Races
              key={year}
              year={year}
              season={season}
              round={round}
              onRound={(nextRound) => show(year, "Races", nextRound)}
            />
          )
        }
      />
    </div>
  );
};
