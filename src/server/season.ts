import { all, get, total } from "./jolpica.ts";
import type {
  Classified,
  DriverInfo,
  Pace,
  QualiResult,
  Records,
  Round,
  Season,
} from "../shared/season.ts";

const races = (d: any): any[] => d.RaceTable.Races;

function byRound(rows: any[], key: string): Map<number, any[]> {
  const out = new Map<number, any[]>();
  for (const r of rows) {
    const round = Number(r.round);
    out.set(round, [...(out.get(round) ?? []), ...r[key]]);
  }
  return out;
}

const position = (text: string): number | null =>
  /^\d+$/.test(text) ? Number(text) : null;

const classified = (r: any): Classified => ({
  driver: r.Driver.driverId,
  team: r.Constructor.constructorId,
  grid: Number(r.grid),
  position: position(r.positionText),
  order: Number(r.position),
  points: Number(r.points),
  status: r.status,
});

const quali = (r: any): QualiResult => ({
  driver: r.Driver.driverId,
  team: r.Constructor.constructorId,
  position: Number(r.position),
  q1: r.Q1 ?? null,
  q2: r.Q2 ?? null,
  q3: r.Q3 ?? null,
});

const when = (s: any): string | null => (s ? `${s.date}T${s.time ?? "00:00:00Z"}` : null);

const alpha = "https://api.jolpi.ca/f1/alpha";
const alphaCache = new Map<string, { at: number; body: Promise<any> }>();

function alphaGet(path: string): Promise<any> {
  const cached = alphaCache.get(path);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.body;
  const request = fetch(`${alpha}/${path}`, {
    headers: { "User-Agent": "f1.ola-vassbotn.no" },
  }).then((res) => {
    if (!res.ok) throw new Error(`jolpica ${res.status} ${path}`);
    return res.json();
  });
  const entry = { at: Date.now(), body: request };
  alphaCache.set(path, entry);
  request.catch(() => {
    if (alphaCache.get(path) === entry) alphaCache.delete(path);
  });
  return request;
}

const alphaDriverName = (r: any): string =>
  `${r.driver.given_name} ${r.driver.family_name}`.toLocaleLowerCase();

export async function sprintQualifying(
  year: number,
  rounds: Round[],
  drivers: DriverInfo[],
) {
  const events: any[] = (await alphaGet(`schedules/${year}/`)).data.events;
  const byName = new Map(
    drivers.map((d) => [d.name.toLocaleLowerCase(), d.id]),
  );
  const sprints = rounds
    .filter((r) => r.sessions.sprintQualifying)
    .map((round) => {
      const event = events.find((e) => e.round.number === round.round);
      return { round, id: event?.round.id };
    })
    .filter((x) => x.id);
  const results = await Promise.all(
    sprints.map(async ({ round, id }) => {
      const entries: any[] = (await alphaGet(`results/${id}/SQ/`)).data.results;
      return {
        round: round.round,
        results: entries.flatMap((r) => {
          const driver = byName.get(alphaDriverName(r));
          const position = Number(r.position);
          return driver && Number.isFinite(position)
            ? [
                {
                  driver,
                  team: drivers.find((d) => d.id === driver)?.team ?? "",
                  position,
                  q1: null,
                  q2: null,
                  q3: null,
                },
              ]
            : [];
        }),
      };
    }),
  );
  return results.filter((r) => r.results.length);
}

const schedule = (r: any): Round => ({
  round: Number(r.round),
  name: r.raceName,
  circuit: r.Circuit.circuitName,
  country: r.Circuit.Location.country,
  sessions: {
    fp1: when(r.FirstPractice),
    fp2: when(r.SecondPractice),
    fp3: when(r.ThirdPractice),
    sprintQualifying: when(r.SprintQualifying ?? r.SprintShootout),
    sprint: when(r.Sprint),
    qualifying: when(r.Qualifying),
    race: when(r),
  },
});

export async function season(): Promise<Season> {
  const [calendar, results, sprints, qualifying, ds, cs] = await Promise.all([
    get("current.json?limit=100"),
    all("current/results.json", races),
    all("current/sprint.json", races),
    all("current/qualifying.json", races),
    get("current/driverstandings.json"),
    get("current/constructorstandings.json"),
  ]);
  const driverRows = ds.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  const teamRows = cs.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
  const drivers: DriverInfo[] = driverRows.map((d: any) => ({
    id: d.Driver.driverId,
    code: d.Driver.code,
    name: `${d.Driver.givenName} ${d.Driver.familyName}`,
    number: d.Driver.permanentNumber,
    team: d.Constructors.at(-1)?.constructorId ?? "",
  }));
  const rounds = races(calendar).map(schedule);
  const sprintQualifyingResults = await sprintQualifying(
    Number(calendar.RaceTable.season),
    rounds,
    drivers,
  ).catch(() => []);
  return {
    year: Number(calendar.RaceTable.season),
    rounds,
    drivers,
    teams: teamRows.map((t: any) => ({ id: t.Constructor.constructorId, name: t.Constructor.name })),
    races: [...byRound(results, "Results")].map(([round, rows]) => ({ round, results: rows.map(classified) })),
    sprints: [...byRound(sprints, "SprintResults")].map(([round, rows]) => ({ round, results: rows.map(classified) })),
    qualifying: [...byRound(qualifying, "QualifyingResults")].map(([round, rows]) => ({ round, results: rows.map(quali) })),
    sprintQualifying: sprintQualifyingResults,
    driverStandings: driverRows.map((d: any) => ({ id: d.Driver.driverId, points: Number(d.points) })),
    constructorStandings: teamRows.map((t: any) => ({ id: t.Constructor.constructorId, points: Number(t.points) })),
  };
}

const seconds = (t: string): number => {
  const [m, s] = t.includes(":") ? t.split(":") : ["0", t];
  return Number(m) * 60 + Number(s);
};

export async function pace(round: number): Promise<Pace> {
  const day = 24 * 60 * 60_000;
  const [laps, stops] = await Promise.all([
    all(`current/${round}/laps.json`, (d) => races(d).flatMap((r) => r.Laps), day),
    all(`current/${round}/pitstops.json`, (d) => races(d).flatMap((r) => r.PitStops), day),
  ]);
  const pit = new Set(
    stops.flatMap((p: any) => [`${p.driverId}:${p.lap}`, `${p.driverId}:${Number(p.lap) + 1}`]),
  );
  const out: Pace = {};
  for (const lap of laps) {
    if (lap.number === "1") continue;
    for (const t of lap.Timings) {
      if (pit.has(`${t.driverId}:${lap.number}`)) continue;
      (out[t.driverId] ??= []).push(seconds(t.time));
    }
  }
  return out;
}

const DAY = 24 * 60 * 60_000;

async function career(id: string, titles: string[]): Promise<Records[string]> {
  const [results, poles] = await Promise.all([
    all(`drivers/${id}/results.json`, (d) => races(d).flatMap((r) => r.Results), DAY),
    total(`drivers/${id}/qualifying/1.json`, DAY),
  ]);
  const place = results.map((r: any) => Number(r.positionText) || 0);
  return {
    starts: results.length,
    wins: place.filter((p) => p === 1).length,
    podiums: place.filter((p) => p >= 1 && p <= 3).length,
    poles,
    titles: titles.filter((t) => t === id).length,
  };
}

export async function records(ids: string[]): Promise<Records> {
  const seasons = await all<string>(
    "seasons.json",
    (d) => d.SeasonTable.Seasons.map((s: any) => s.season),
    DAY,
  );
  const champions = await Promise.all(
    seasons.map(async (year) => {
      const standings = await get(`${year}/driverstandings/1.json`, DAY);
      return standings.StandingsTable.StandingsLists[0]?.DriverStandings[0]
        ?.Driver.driverId;
    }),
  );
  const rows = [];
  for (const id of ids) rows.push([id, await career(id, champions)] as const);
  return Object.fromEntries(rows);
}
