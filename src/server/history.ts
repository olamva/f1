import type { DriverProfile, RaceArchive } from "../shared/season.ts";
import { all, get, total } from "./jolpica.ts";

const DAY = 24 * 60 * 60_000;
const NON_START = new Set([
  "Did not start",
  "Did not qualify",
  "Did not prequalify",
  "Withdrew",
]);

type Result = RaceArchive["races"][number]["results"][number];

const result = (row: any): Result => ({
  driver: row.Driver.driverId,
  name: `${row.Driver.givenName} ${row.Driver.familyName}`,
  number: row.number ?? row.Driver.permanentNumber ?? "",
  team: row.Constructor?.constructorId ?? "",
  teamName: row.Constructor?.name ?? "",
  grid: Number(row.grid ?? 0),
  position: Number(row.position),
  positionText: row.positionText,
  points: Number(row.points),
  status: row.status ?? "",
});

export async function raceArchive(year: number): Promise<RaceArchive> {
  const freshMs = year === new Date().getUTCFullYear() ? undefined : DAY;
  const [rows, sprintRows] = await Promise.all([
    all<any>(`${year}/results.json`, (data) => data.RaceTable.Races, freshMs),
    all<any>(`${year}/sprint.json`, (data) => data.RaceTable.Races, freshMs),
  ]);
  const races = new Map<number, RaceArchive["races"][number]>();
  const entry = (race: any) => {
    const round = Number(race.round);
    if (!races.has(round))
      races.set(round, {
        round,
        name: race.raceName,
        date: race.date,
        country: race.Circuit.Location.country,
        results: [],
        sprint: [],
      });
    return races.get(round)!;
  };
  for (const race of rows)
    entry(race).results.push(...race.Results.map(result));
  for (const race of sprintRows)
    entry(race).sprint.push(...race.SprintResults.map(result));
  const byPosition = (a: Result, b: Result) => a.position - b.position;
  return {
    year,
    races: [...races.values()]
      .map((race) => ({
        ...race,
        results: race.results.sort(byPosition),
        sprint: race.sprint.sort(byPosition),
      }))
      .sort((a, b) => b.round - a.round),
  };
}

export async function driverProfile(id: string): Promise<DriverProfile | null> {
  const [driver, races, poles] = await Promise.all([
    get(`drivers/${id}.json`, DAY),
    all<any>(`drivers/${id}/results.json`, (data) => data.RaceTable.Races, DAY),
    total(`drivers/${id}/qualifying/1.json`, DAY),
  ]);
  const info = driver.DriverTable.Drivers[0];
  if (!info) return null;
  const results = races.flatMap((race) => race.Results);
  const seasons = races.map((race) => Number(race.season));
  return {
    id,
    name: `${info.givenName} ${info.familyName}`,
    nationality: info.nationality ?? null,
    dateOfBirth: info.dateOfBirth ?? null,
    number: info.permanentNumber ?? null,
    url: info.url?.startsWith("http")
      ? info.url.replace(/^http:/, "https:")
      : null,
    firstSeason: seasons.length ? Math.min(...seasons) : null,
    lastSeason: seasons.length ? Math.max(...seasons) : null,
    starts: new Set(
      races
        .filter((race) =>
          race.Results.some((result: any) => !NON_START.has(result.status)),
        )
        .map((race) => `${race.season}:${race.round}`),
    ).size,
    wins: results.filter((result) => result.positionText === "1").length,
    podiums: results.filter((result) =>
      ["1", "2", "3"].includes(result.positionText),
    ).length,
    poles: Math.min(...seasons) < 1994 ? null : poles,
  };
}
