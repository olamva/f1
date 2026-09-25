import { DefaultAzureCredential } from "@azure/identity";
import type { Pace } from "../shared/season.ts";
import { seasonSessions } from "./archive.ts";
import { get } from "./jolpica.ts";
import { F1_ORIGIN } from "./origin.ts";
import { racePace, seconds } from "./season.ts";
import { parseStream, Session } from "./timing.ts";

export type PaceKind = "race" | "sprint";

const store = process.env.TRANSCRIPT_STORE;
const credential = new DefaultAzureCredential({
  managedIdentityClientId: process.env.AZURE_CLIENT_ID,
});
const cache = new Map<string, Promise<Pace>>();

const blob = async (path: string, init: RequestInit = {}) => {
  const { token } = await credential.getToken(
    "https://storage.azure.com/.default",
  );
  return fetch(`${store}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "x-ms-version": "2023-11-03",
      ...init.headers,
    },
  });
};

const archiveText = async (path: string, topic: string) => {
  const res = await fetch(`${F1_ORIGIN}/static/${path}${topic}.jsonStream`);
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
  const calendar = await get(`${year}/${round}.json`);
  const sprint = calendar.RaceTable.Races[0]?.Sprint;
  if (!sprint) throw new Error("Sprint is not available for this round");
  const start = Date.parse(`${sprint.date}T${sprint.time ?? "00:00:00Z"}`);
  const sessions = await seasonSessions(year);
  const match = sessions
    .filter((s) => /^Sprint(?: Race)?$/.test(s.name) && s.path)
    .sort(
      (a, b) =>
        Math.abs(Date.parse(a.start) - start) -
        Math.abs(Date.parse(b.start) - start),
    )[0];
  if (!match || Math.abs(Date.parse(match.start) - start) > 24 * 60 * 60_000)
    throw new Error("Sprint timing is not available yet");
  const [timing, results] = await Promise.all([
    archiveText(match.path, "TimingData"),
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
  if (store) {
    try {
      const hit = await blob(path);
      if (hit.ok) return hit.json();
      if (hit.status !== 404) console.error("pace store read:", hit.status);
    } catch (error) {
      console.error("pace store read:", error);
    }
  }
  const result =
    kind === "race"
      ? await racePace(year, round)
      : await loadSprint(year, round);
  if (!Object.values(result).some((laps) => laps.length > 5))
    throw new Error("Pace data is not available yet");
  if (store) {
    try {
      const saved = await blob(path, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "content-type": "application/json",
        },
        body: JSON.stringify(result),
      });
      if (!saved.ok) console.error("pace store write:", saved.status);
    } catch (error) {
      console.error("pace store write:", error);
    }
  }
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
