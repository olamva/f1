import type { DriverProfile, RaceArchive } from "../shared/season.ts";
import { all, get, total } from "./jolpica.ts";

const DAY = 24 * 60 * 60_000;
const NON_START = new Set([
  "Did not start",
  "Did not qualify",
  "Did not prequalify",
  "Withdrew",
]);

export async function raceArchive(year: number): Promise<RaceArchive> {
  const rows = await all<any>(
    `${year}/results.json`,
    (data) => data.RaceTable.Races,
    year === new Date().getUTCFullYear() ? undefined : DAY,
  );
  const races = new Map<number, RaceArchive["races"][number]>();
  for (const race of rows) {
    const round = Number(race.round);
    const entry = races.get(round) ?? {
      round,
      name: race.raceName,
      date: race.date,
      country: race.Circuit.Location.country,
      results: [] as RaceArchive["races"][number]["results"],
    };
    entry.results.push(
      ...race.Results.map((result: any) => ({
        driver: result.Driver.driverId,
        name: `${result.Driver.givenName} ${result.Driver.familyName}`,
        number: result.number ?? result.Driver.permanentNumber ?? "",
        team: result.Constructor?.constructorId ?? "",
        teamName: result.Constructor?.name ?? "",
        grid: Number(result.grid ?? 0),
        position: Number(result.position),
        positionText: result.positionText,
        points: Number(result.points),
        status: result.status ?? "",
      })),
    );
    races.set(round, entry);
  }
  return {
    year,
    races: [...races.values()]
      .map((race) => ({
        ...race,
        results: race.results.sort((a, b) => a.position - b.position),
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
