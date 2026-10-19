import type { Pace } from "../shared/season.ts";
import { sessionPath } from "./archive.ts";
import { DATA_DIR, readJson, writeJson } from "./data.ts";
import { get } from "./jolpica.ts";
import { archive } from "./origin.ts";
import { racePace, seconds } from "./season.ts";
import { parseStream, Session } from "./timing.ts";

export type PaceKind = "race" | "sprint";

const cache = new Map<string, Promise<Pace>>();

const archiveText = async (path: string, topic: string) => {
  const res = await archive(`${path}${topic}.jsonStream`);
  if (!res.ok) throw new Error(`archive ${res.status} ${topic}`);
  return res.text();
};

export function sprintPace(
  timing: string,
  drivers: { number: string; id: string }[],
): Pace {
  const session = new Session();
  const pit = new Set<string>();
  for (const event of parseStream(timing, "TimingData")) {
    session.apply(event);
    const lines = (event.data as { Lines?: Record<string, any> }).Lines ?? {};
    for (const [number, line] of Object.entries(lines)) {
      if (line.InPit !== true) continue;
      const lap = session.laps[number]?.at(-1)?.lap ?? 0;
      pit.add(`${number}:${lap}`);
      pit.add(`${number}:${lap + 1}`);
    }
  }
  const byNumber = new Map(drivers.map((driver) => [driver.number, driver.id]));
  const out: Pace = {};
  for (const [number, laps] of Object.entries(session.laps)) {
    const driver = byNumber.get(number);
    if (!driver) continue;
    out[driver] = laps
      .filter(
        ({ lap, time }) => lap > 1 && time && !pit.has(`${number}:${lap}`),
      )
      .map(({ time }) => seconds(time))
      .filter(Number.isFinite);
  }
  return out;
}

async function loadSprint(year: number, round: number): Promise<Pace> {
  const path = await sessionPath(year, round, "sprint");
  const [timing, results] = await Promise.all([
    archiveText(path, "TimingData"),
    get(`${year}/${round}/sprint.json?limit=100`),
  ]);
  const drivers =
    results.RaceTable.Races[0]?.SprintResults.map((row: any) => ({
      id: row.Driver.driverId,
      number: row.number,
    })) ?? [];
  return sprintPace(timing, drivers);
}

async function load(
  year: number,
  round: number,
  kind: PaceKind,
): Promise<Pace> {
  const path = `pace/v1/${year}/${round}/${kind}.json`;
  if (DATA_DIR) {
    const hit = await readJson(path).catch((error) => {
      console.error("pace store read:", error);
      return null;
    });
    if (hit) return hit;
  }
  const result =
    kind === "race"
      ? await racePace(year, round)
      : await loadSprint(year, round);
  if (!Object.values(result).some((laps) => laps.length > 5))
    throw new Error("Pace data is not available yet");
  if (DATA_DIR)
    await writeJson(path, result).catch((error) =>
      console.error("pace store write:", error),
    );
  return result;
}

export function pace(
  year: number,
  round: number,
  kind: PaceKind,
): Promise<Pace> {
  const key = `${year}:${round}:${kind}`;
  if (!cache.has(key)) {
    const result = load(year, round, kind);
    cache.set(key, result);
    result.catch(() => {
      if (cache.get(key) === result) cache.delete(key);
    });
  }
  return cache.get(key)!;
}
