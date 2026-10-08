import { useRef, useState, type ReactNode } from "react";
import type {
  LapPositions,
  Qualifying,
  RaceArchive,
  Season,
  Stints,
} from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { useJson } from "./api.ts";
import { FAVOURITE_ROW, useFavourite } from "./favourite.ts";
import { Flag } from "./Flag.tsx";
import { Loading } from "./Loading.tsx";
import { openDriver, pathPart, pathSegment } from "./path.ts";
import { Podium } from "./Podium.tsx";
import { Positions } from "./Positions.tsx";
import { Spoiler } from "./Spoiler.tsx";
import { Standings } from "./Standings.tsx";
import { Strategy } from "./Strategy.tsx";
import { Swipe } from "./Swipe.tsx";
import { TeamLogo } from "./TeamLogo.tsx";
import { Tabs } from "./Tabs.tsx";

const SESSIONS = ["sprintQualifying", "sprint", "qualifying", "race"] as const;
type Kind = (typeof SESSIONS)[number];
const LABELS = { sprintQualifying: "SQ", qualifying: "Quali" };
const VIEWS = ["results", "tyres", "positions"] as const;
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

type Race = RaceArchive["races"][number];
type Result = Race["results"][number];
type Entry = Pick<
  Result,
  "driver" | "name" | "team" | "teamName" | "positionText"
>;

interface ResultsTableProps<T extends Entry> {
  rows: T[];
  favourite?: string;
  columns: string[];
  cells: (row: T) => ReactNode;
  wide?: boolean;
}

const ResultsTable = <T extends Entry>({
  rows,
  favourite,
  columns,
  cells,
  wide,
}: ResultsTableProps<T>) => (
  <table className="tabular w-full text-xs sm:text-sm">
    <thead className="text-left text-xs text-zinc-500">
      <tr>
        <th className="w-8 pb-2">Pos</th>
        <th className="pb-2">Driver</th>
        <th className={`pb-2 pl-2 ${wide ? "max-sm:hidden" : ""}`}>Team</th>
        {columns.map((column) => (
          <th key={column} className="pb-2 pl-2 text-right">
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {(rows.length >= 3 ? rows.slice(3) : rows).map((row, index) => (
        <tr
          key={`${row.driver}:${index}`}
          className={`relative border-t border-zinc-800 hover:bg-zinc-800/50 ${row.driver === favourite ? FAVOURITE_ROW : ""}`}
        >
          <td className="py-2 font-semibold">{row.positionText}</td>
          <td className="py-2">
            <button
              type="button"
              onClick={() => openDriver(row.driver)}
              className="cursor-pointer text-left after:absolute after:inset-0"
            >
              <TeamLogo
                team={row.team}
                className="mr-1.5 inline h-4 w-6 align-[-3px] sm:mr-2"
              />
              {row.name}
            </button>
          </td>
          <td
            className={`py-2 pl-2 text-zinc-400 ${wide ? "max-sm:hidden" : ""}`}
          >
            {row.teamName}
          </td>
          {cells(row)}
        </tr>
      ))}
    </tbody>
  </table>
);

interface ClassificationProps<T extends Entry> extends ResultsTableProps<T> {
  value: (row: T) => string;
}

const Classification = <T extends Entry>({
  value,
  ...table
}: ClassificationProps<T>) => (
  <>
    {table.rows.length >= 3 && (
      <Podium
        entries={table.rows.map((row) => ({
          id: row.driver,
          name: row.name,
          color: teamColor(row.team),
          value: value(row),
          detail: row.teamName,
        }))}
        crowned
        onSelect={openDriver}
      />
    )}
    <ResultsTable {...table} />
  </>
);

const raceCells = (result: Result) => {
  const status = result.status === "Finished" ? "" : result.status;
  return (
    <>
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
    </>
  );
};

interface RaceBodyProps {
  year: string;
  round: number;
  kind: "race" | "sprint";
  rows: Result[];
  favourite?: string;
}

const RaceBody = ({ year, round, kind, rows, favourite }: RaceBodyProps) => {
  const [view, setView] = useState<(typeof VIEWS)[number]>("results");
  const archived = Number(year) >= 2018;
  const shown = archived ? view : "results";
  const strategy = useJson<Stints>(
    shown === "tyres" ? `/api/stints/${year}/${round}/${kind}` : null,
  );
  const positions = useJson<LapPositions>(
    shown === "positions" ? `/api/positions/${year}/${round}/${kind}` : null,
  );
  return (
    <>
      {archived && (
        <div className="mb-4">
          <Tabs items={VIEWS} value={view} onChange={setView} small />
        </div>
      )}
      {shown === "tyres" ? (
        strategy.data ? (
          <Strategy rows={rows} stints={strategy.data} favourite={favourite} />
        ) : (
          <Loading
            label="Loading tyre strategy…"
            error={
              strategy.error && "Tyre data is not available for this session."
            }
          />
        )
      ) : shown === "positions" ? (
        positions.data ? (
          <Positions rows={rows} laps={positions.data} favourite={favourite} />
        ) : (
          <Loading
            label="Loading positions…"
            error={
              positions.error &&
              "Position data is not available for this session."
            }
          />
        )
      ) : (
        <Classification
          key={`${round}:${kind}`}
          rows={rows}
          favourite={favourite}
          columns={["Grid", "Status", "Pts"]}
          cells={raceCells}
          value={(result) => `${result.points} pts`}
        />
      )}
    </>
  );
};

interface QualifyingBodyProps {
  year: string;
  race: Race;
  kind: "qualifying" | "sprintQualifying";
  favourite?: string;
}

const QualifyingBody = ({
  year,
  race,
  kind,
  favourite,
}: QualifyingBodyProps) => {
  const quali = useJson<Qualifying>(
    `/api/qualifying/${year}/${race.round}/${kind === "qualifying" ? "race" : "sprint"}`,
  );
  if (!quali.data)
    return (
      <Loading
        label="Loading qualifying results…"
        error={
          quali.error &&
          "Qualifying results are not available for this session."
        }
      />
    );
  const entrants = new Map(
    [...race.sprint, ...race.results].map((result) => [result.number, result]),
  );
  const prefix = kind === "qualifying" ? "Q" : "SQ";
  return (
    <Classification
      rows={quali.data.map(({ number, position, times }) => ({
        driver: "",
        name: `#${number}`,
        team: "",
        teamName: "",
        ...entrants.get(number),
        positionText: String(position),
        times,
      }))}
      favourite={favourite}
      columns={[1, 2, 3].map((part) => `${prefix}${part}`)}
      cells={(row) =>
        row.times.map((time, part) => (
          <td key={part} className="py-2 pl-2 text-right text-zinc-400">
            {time ?? "–"}
          </td>
        ))
      }
      value={(row) => row.times.findLast(Boolean) ?? ""}
      wide
    />
  );
};

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
  const available: Record<Kind, boolean> = {
    sprintQualifying: race.sprint.length > 0 && Number(year) >= 2023,
    sprint: race.sprint.length > 0,
    qualifying: Number(year) >= 2018,
    race: race.results.length > 0,
  };
  const sessions = SESSIONS.filter((kind) => available[kind]);
  const shown = available[session] ? session : "sprint";
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
          {shown === "race" || shown === "sprint" ? (
            <RaceBody
              year={year}
              round={race.round}
              kind={shown}
              rows={shown === "sprint" ? race.sprint : race.results}
              favourite={favourite?.id}
            />
          ) : (
            <QualifyingBody
              key={`${race.round}:${shown}`}
              year={year}
              race={race}
              kind={shown}
              favourite={favourite?.id}
            />
          )}
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
          className="bg-surface rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white"
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
