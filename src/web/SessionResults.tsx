import { useState, type ReactNode } from "react";
import type {
  LapPositions,
  Practice,
  Qualifying,
  RaceArchive,
  Stints,
} from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import type { FastestLaps } from "../shared/timing.ts";
import { useJson } from "./api.ts";
import { FAVOURITE_ROW } from "./favourite.ts";
import { LapCompare } from "./LapCompare.tsx";
import { Loading } from "./Loading.tsx";
import { openDriver } from "./path.ts";
import { Podium } from "./Podium.tsx";
import { Positions } from "./Positions.tsx";
import { Strategy } from "./Strategy.tsx";
import { TeamLogo } from "./TeamLogo.tsx";
import { Tabs } from "./Tabs.tsx";

export const SESSIONS = [
  "fp1",
  "fp2",
  "fp3",
  "sprintQualifying",
  "sprint",
  "qualifying",
  "race",
] as const;
export type Kind = (typeof SESSIONS)[number];
const VIEWS = ["results", "tyres", "positions", "compare"] as const;
type View = (typeof VIEWS)[number];

type Race = RaceArchive["races"][number];
type Result = Race["results"][number];
type Entry = Pick<
  Result,
  "driver" | "name" | "team" | "teamName" | "positionText"
>;

const entrants = (races: Race[], round: number) =>
  new Map(
    races
      .filter((race) => race.round <= round)
      .toReversed()
      .flatMap((race) => [...race.sprint, ...race.results])
      .map((result) => [result.number, result]),
  );

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
              disabled={!row.driver}
              className="cursor-pointer text-left after:absolute after:inset-0 disabled:cursor-default"
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
  shown: View;
}

const RaceBody = ({
  year,
  round,
  kind,
  rows,
  favourite,
  shown,
}: RaceBodyProps) => {
  const strategy = useJson<Stints>(
    shown === "tyres" ? `/api/stints/${year}/${round}/${kind}` : null,
  );
  const positions = useJson<LapPositions>(
    shown === "positions" ? `/api/positions/${year}/${round}/${kind}` : null,
  );
  return shown === "tyres" ? (
    strategy.data ? (
      <Strategy rows={rows} stints={strategy.data} favourite={favourite} />
    ) : (
      <Loading
        label="Loading tyre strategy…"
        error={strategy.error && "Tyre data is not available for this session."}
      />
    )
  ) : shown === "positions" ? (
    positions.data ? (
      <Positions rows={rows} laps={positions.data} favourite={favourite} />
    ) : (
      <Loading
        label="Loading positions…"
        error={
          positions.error && "Position data is not available for this session."
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
  );
};

interface QualifyingBodyProps {
  year: string;
  race: Race;
  races: Race[];
  kind: "qualifying" | "sprintQualifying";
  favourite?: string;
}

const QualifyingBody = ({
  year,
  race,
  races,
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
  const known = entrants(races, race.round);
  const prefix = kind === "qualifying" ? "Q" : "SQ";
  return (
    <Classification
      rows={quali.data.map(({ number, position, times }) => ({
        driver: "",
        name: `#${number}`,
        team: "",
        teamName: "",
        ...known.get(number),
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

interface PracticeBodyProps {
  year: string;
  race: Race;
  races: Race[];
  kind: "fp1" | "fp2" | "fp3";
  favourite?: string;
}

const PracticeBody = ({
  year,
  race,
  races,
  kind,
  favourite,
}: PracticeBodyProps) => {
  const practice = useJson<Practice>(
    `/api/practice/${year}/${race.round}/${kind}`,
  );
  if (!practice.data)
    return (
      <Loading
        label="Loading practice results…"
        error={
          practice.error &&
          "Practice results are not available for this session."
        }
      />
    );
  const known = entrants(races, race.round);
  const teams = new Map(
    practice.data.flatMap((row) => {
      const entrant = known.get(row.number);
      return entrant ? [[row.team, entrant] as const] : [];
    }),
  );
  return (
    <Classification
      rows={practice.data.map(({ number, position, name, team, ...row }) => ({
        driver: "",
        name,
        team: teams.get(team)?.team ?? "",
        teamName: teams.get(team)?.teamName ?? team,
        ...known.get(number),
        positionText: String(position),
        ...row,
      }))}
      favourite={favourite}
      columns={["Time", "Gap", "Laps"]}
      cells={(row) => (
        <>
          <td className="py-2 pl-2 text-right font-semibold">
            {row.time ?? "–"}
          </td>
          <td className="py-2 pl-2 text-right text-zinc-400">{row.gap}</td>
          <td className="py-2 pl-2 text-right text-zinc-400">{row.laps}</td>
        </>
      )}
      value={(row) => row.time ?? ""}
      wide
    />
  );
};

interface CompareProps {
  year: string;
  round: number;
  kind: Kind;
}

const Compare = ({ year, round, kind }: CompareProps) => {
  const laps = useJson<FastestLaps>(`/api/fastest/${year}/${round}/${kind}`);
  return laps.data ? (
    <LapCompare
      outline={laps.data.outline}
      drivers={laps.data.drivers.map((d) => ({ ...d, time: d.lap.time }))}
    />
  ) : (
    <Loading
      label="Loading the fastest laps. A race takes a few seconds…"
      error={laps.error && "Lap telemetry is not available for this session."}
    />
  );
};

interface SessionResultsProps {
  year: string;
  race: Race;
  races: Race[];
  kind: Kind;
  favourite?: string;
}

export const SessionResults = ({
  year,
  race,
  races,
  kind,
  favourite,
}: SessionResultsProps) => {
  const [view, setView] = useState<View>("results");
  const racing = kind === "race" || kind === "sprint";
  const views =
    Number(year) >= 2018
      ? VIEWS.filter((v) => racing || v === "results" || v === "compare")
      : [];
  const shown = views.includes(view) ? view : "results";
  return (
    <>
      {views.length > 0 && (
        <div className="mb-4">
          <Tabs items={views} value={shown} onChange={setView} small />
        </div>
      )}
      {shown === "compare" ? (
        <Compare year={year} round={race.round} kind={kind} />
      ) : racing ? (
        <RaceBody
          year={year}
          round={race.round}
          kind={kind}
          rows={kind === "sprint" ? race.sprint : race.results}
          favourite={favourite}
          shown={shown}
        />
      ) : kind === "qualifying" || kind === "sprintQualifying" ? (
        <QualifyingBody
          key={`${race.round}:${kind}`}
          year={year}
          race={race}
          races={races}
          kind={kind}
          favourite={favourite}
        />
      ) : (
        <PracticeBody
          key={`${race.round}:${kind}`}
          year={year}
          race={race}
          races={races}
          kind={kind}
          favourite={favourite}
        />
      )}
    </>
  );
};
