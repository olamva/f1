import { lapSeconds } from "../../shared/timing.ts";

type Obj = Record<string, any>;

export type Mark = "overall" | "personal" | "normal" | "none";

export type Row = {
  number: string;
  tla: string;
  name: string;
  team: string;
  color: string;
  position: number;
  gap: string;
  interval: string;
  lastLap: string;
  lastMark: Mark;
  bestLap: string;
  sectors: { value: string; mark: Mark }[];
  tyre: string;
  tyreAge: number | null;
  pits: number;
  status: string;
};

const mark = (x: Obj | undefined): Mark =>
  !x?.Value ? "none" : x.OverallFastest ? "overall" : x.PersonalFastest ? "personal" : "normal";

const values = (x: unknown): Obj[] =>
  Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x as Obj) : [];

const statusOf = (l: Obj): string =>
  l.Retired ? "OUT" : l.Stopped ? "STOP" : l.KnockedOut ? "KO" : l.InPit ? "PIT" : l.PitOut ? "OUT LAP" : "";

function tyre(app: Obj | undefined): { tyre: string; tyreAge: number | null } {
  const stint = values(app?.Stints).at(-1);
  return { tyre: stint?.Compound ?? "", tyreAge: stint?.TotalLaps ?? null };
}

function row(number: string, line: Obj, driver: Obj, app: Obj | undefined): Row {
  return {
    number,
    tla: driver.Tla ?? number,
    name: driver.FullName ?? "",
    team: driver.TeamName ?? "",
    color: `#${driver.TeamColour ?? "888888"}`,
    position: Number(line.Position ?? driver.Line ?? 99),
    gap: line.GapToLeader ?? line.TimeDiffToFastest ?? "",
    interval: line.IntervalToPositionAhead?.Value ?? line.TimeDiffToPositionAhead ?? "",
    lastLap: line.LastLapTime?.Value ?? "",
    lastMark: mark(line.LastLapTime),
    bestLap: line.BestLapTime?.Value ?? "",
    sectors: values(line.Sectors).map((s) => ({ value: s.Value ?? "", mark: mark(s) })),
    ...tyre(app),
    pits: Number(line.NumberOfPitStops ?? 0),
    status: statusOf(line),
  };
}

export function rows(state: Obj): Row[] {
  const lines: Obj = state.TimingData?.Lines ?? {};
  const drivers: Obj = state.DriverList ?? {};
  const apps: Obj = state.TimingAppData?.Lines ?? {};
  return Object.entries(lines)
    .filter(([n]) => drivers[n])
    .map(([n, line]) => row(n, line, drivers[n], apps[n]))
    .sort((a, b) => a.position - b.position);
}

export type Message = { utc: string; category: string; flag: string; text: string };

export const messages = (state: Obj): Message[] =>
  values(state.RaceControlMessages?.Messages)
    .map((m) => ({ utc: m.Utc, category: m.Category, flag: m.Flag ?? "", text: m.Message }))
    .reverse();

export type Radio = { utc: string; number: string; url: string };

export const radios = (state: Obj): Radio[] =>
  values(state.TeamRadio?.Captures)
    .map((c) => ({
      utc: c.Utc,
      number: c.RacingNumber,
      url: `https://livetiming.formula1.com/static/${state.SessionInfo?.Path ?? ""}${c.Path}`,
    }))
    .reverse();

const TRACK_STATUS: Record<string, { label: string; tone: string }> = {
  "2": { label: "Yellow Flag", tone: "bg-yellow-400 text-black" },
  "4": { label: "Safety Car", tone: "bg-yellow-400 text-black" },
  "5": { label: "Red Flag", tone: "bg-red-600 text-white" },
  "6": { label: "VSC", tone: "bg-yellow-400 text-black" },
  "7": { label: "VSC ending", tone: "bg-yellow-300 text-black" },
};

export const trackStatus = (state: Obj): { label: string; tone: string } | null => {
  const code = state.TrackStatus?.Status;
  if (!code || code === "1") return null;
  return TRACK_STATUS[code] ?? { label: state.TrackStatus?.Message ?? code, tone: "bg-zinc-700" };
};

export function remaining(state: Obj, utcNow: number): string {
  const clock = state.ExtrapolatedClock;
  if (!clock?.Remaining) return "";
  const [h, m, s] = String(clock.Remaining).split(":").map(Number);
  let left = ((h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)) * 1000;
  if (clock.Extrapolating) left -= Math.max(0, utcNow - Date.parse(clock.Utc));
  const total = Math.max(0, Math.round(left / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

export const gapSeconds = (gap: string): number | null =>
  /^LAP|^$/.test(gap) ? 0 : /L/.test(gap) ? null : lapSeconds(gap.replace("+", ""));
