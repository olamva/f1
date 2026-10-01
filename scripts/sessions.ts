import { writeFileSync } from "node:fs";

const SESSIONS: Record<string, [string, number]> = {
  FirstPractice: ["Practice 1", 60],
  SecondPractice: ["Practice 2", 60],
  ThirdPractice: ["Practice 3", 60],
  SprintQualifying: ["Sprint Qualifying", 45],
  Sprint: ["Sprint", 60],
  Qualifying: ["Qualifying", 60],
  Race: ["Race", 120],
};
const LEADS = [15, 5];
const BASE = "https://api.jolpi.ca/ergast/f1";
const MINUTE = 60_000;

export type Race = { date: string; time?: string } & Record<
  string,
  { date: string; time?: string } | string | undefined
>;
export type Window = {
  title: string;
  at: number;
  start: number;
  end: number;
};

export function windows(races: Race[]): Window[] {
  return races.flatMap((race) =>
    Object.entries(SESSIONS).flatMap(([key, [name, duration]]) => {
      const session = key === "Race" ? race : race[key];
      if (
        !session ||
        typeof session === "string" ||
        !session.date ||
        !session.time
      )
        return [];
      const at = Date.parse(`${session.date}T${session.time}`);
      return Number.isFinite(at)
        ? [
            {
              title: `${race.raceName} · ${name}`,
              at,
              start: at - 15 * MINUTE,
              end: at + (duration + 120) * MINUTE,
            },
          ]
        : [];
    }),
  );
}

export function shouldWake(schedule: Window[], now: number): boolean {
  return schedule.some((w) => now >= w.start && now <= w.end);
}

export function reminders(schedule: Window[], now: number) {
  const slot = Math.floor(now / (5 * MINUTE)) * 5 * MINUTE;
  return schedule.flatMap(({ title, at }) =>
    LEADS.filter(
      (lead) =>
        at - lead * MINUTE > slot - 5 * MINUTE && at - lead * MINUTE <= slot,
    ).map((lead) => ({
      title,
      body: `Starts in ${lead} minutes.`,
      tag: `${at}-${lead}`,
      ttl: lead * 60,
    })),
  );
}

export async function calendar(year: number, request = fetch): Promise<Race[]> {
  const response = await request(`${BASE}/${year}.json?limit=100`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`calendar ${year}: ${response.status}`);
  const races = (await response.json())?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races))
    throw new Error(`calendar ${year}: invalid response`);
  return races;
}

export async function schedule(
  now = Date.now(),
  request = fetch,
): Promise<Window[]> {
  const year = new Date(now).getUTCFullYear();
  const [current, next] = await Promise.all([
    calendar(year, request),
    calendar(year + 1, request).catch(() => []),
  ]);
  if (!current.length) throw new Error(`calendar ${year}: empty season`);
  return windows([...current, ...next]);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  const result = await schedule();
  writeFileSync(
    new URL("../infra/sessions.json", import.meta.url),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(`${result.length} session windows`);
}
