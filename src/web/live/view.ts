import { lapSeconds } from "../../shared/timing.ts";

type Obj = Record<string, any>;

export type Mark = "overall" | "personal" | "normal" | "none";

export type Row = {
  number: string;
  tla: string;
  name: string;
  last: string;
  team: string;
  color: string;
  position: number;
  gained: number | null;
  gap: string;
  lapsBehind: number | null;
  interval: string;
  lastLap: string;
  lastMark: Mark;
  bestLap: string;
  sectors: { value: string; mark: Mark; segments: Mark[] }[];
  tyre: string;
  tyreAge: number | null;
  pits: number;
  status: string;
};

export type SessionBest = {
  number: string;
  tla: string;
  color: string;
  value: string;
};

export type SessionBests = {
  sectors: (SessionBest | null)[];
  lap: SessionBest | null;
};

const mark = (x: Obj | undefined): Mark =>
  !x?.Value
    ? "none"
    : x.OverallFastest
      ? "overall"
      : x.PersonalFastest
        ? "personal"
        : "normal";

const SEGMENT: Record<number, Mark> = {
  2048: "normal",
  2049: "personal",
  2051: "overall",
};

const values = (x: unknown): Obj[] =>
  Array.isArray(x)
    ? x
    : x && typeof x === "object"
      ? Object.values(x as Obj)
      : [];

const statusOf = (l: Obj): string =>
  l.Retired || l.Stopped
    ? "OUT"
    : l.KnockedOut
      ? "KO"
      : l.InPit
        ? "PIT"
        : l.PitOut
          ? "OUT LAP"
          : "";

function tyre(app: Obj | undefined): { tyre: string; tyreAge: number | null } {
  const stint = values(app?.Stints).at(-1);
  return { tyre: stint?.Compound ?? "", tyreAge: stint?.TotalLaps ?? null };
}

const lapGap = (gap: string): number | null => {
  const laps = /^\+?(\d+) ?L(?:APS?)?$/i.exec(gap)?.[1];
  return laps ? Number(laps) : null;
};

const gained = (app: Obj | undefined, position: number): number | null => {
  const grid = Number(app?.GridPos);
  return grid ? grid - position : null;
};

function row(
  number: string,
  line: Obj,
  driver: Obj,
  app: Obj | undefined,
): Row {
  const gap = line.GapToLeader ?? line.TimeDiffToFastest ?? "";
  const position = Number(line.Position ?? driver.Line ?? 99);
  return {
    number,
    tla: driver.Tla ?? number,
    name: driver.FullName ?? "",
    last: driver.LastName ?? driver.Tla ?? number,
    team: driver.TeamName ?? "",
    color: `#${driver.TeamColour ?? "888888"}`,
    position,
    gained: gained(app, position),
    gap,
    lapsBehind: lapGap(gap),
    interval:
      line.IntervalToPositionAhead?.Value ?? line.TimeDiffToPositionAhead ?? "",
    lastLap: line.LastLapTime?.Value ?? "",
    lastMark: mark(line.LastLapTime),
    bestLap: line.BestLapTime?.Value ?? "",
    sectors: values(line.Sectors).map((s) => ({
      value: s.Value ?? "",
      mark: mark(s),
      segments: values(s.Segments).map((g) => SEGMENT[g.Status] ?? "none"),
    })),
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

export const sessionBests = (state: Obj, drivers: Row[]): SessionBests => {
  const stats: Obj = state.TimingStats?.Lines ?? {};
  const timing: Obj = state.TimingData?.Lines ?? {};
  const fastest = (
    value: (number: string) => string | undefined,
  ): SessionBest | null =>
    drivers.reduce<SessionBest | null>((best, driver) => {
      const time = value(driver.number) ?? "";
      const seconds = lapSeconds(time);
      return seconds !== null &&
        (best === null || seconds < lapSeconds(best.value)!)
        ? {
            number: driver.number,
            tla: driver.tla,
            color: driver.color,
            value: time,
          }
        : best;
    }, null);
  return {
    sectors: [0, 1, 2].map((i) =>
      fastest((n) => values(stats[n]?.BestSectors)[i]?.Value),
    ),
    lap: fastest(
      (n) =>
        stats[n]?.PersonalBestLapTime?.Value ?? timing[n]?.BestLapTime?.Value,
    ),
  };
};

export const isQualifying = (info: Obj | undefined): boolean =>
  /Qualifying|Shootout/i.test(info?.Name ?? "");

export type Message = {
  utc: string;
  category: string;
  flag: string;
  text: string;
};

export const messages = (state: Obj): Message[] =>
  values(state.RaceControlMessages?.Messages)
    .map((m) => ({
      utc: m.Utc,
      category: m.Category,
      flag: m.Flag ?? "",
      text: m.Message,
    }))
    .reverse();

export const sessionStart = (state: Obj): number | null => {
  const info = state.SessionInfo;
  const offset = String(info?.GmtOffset ?? "00:00");
  return info?.StartDate
    ? Date.parse(
        `${info.StartDate}${offset.startsWith("-") ? "" : "+"}${offset.slice(0, 5)}`,
      )
    : null;
};

export const elapsed = (utc: string, start: number): string => {
  const total = Math.max(
    0,
    Math.round(
      (Date.parse(utc.endsWith("Z") ? utc : `${utc}Z`) - start) / 1000,
    ),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
};

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

export const trackStatus = (
  state: Obj,
): { label: string; tone: string } | null => {
  const code = state.TrackStatus?.Status;
  if (!code || code === "1") return null;
  if (
    code === "4" &&
    /SAFETY CAR IN THIS LAP/i.test(
      messages(state).find((m) => /SAFETY CAR/i.test(m.text))?.text ?? "",
    )
  )
    return { label: "Safety Car ending", tone: "bg-yellow-300 text-black" };
  return (
    TRACK_STATUS[code] ?? {
      label: state.TrackStatus?.Message ?? code,
      tone: "bg-zinc-700",
    }
  );
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
  /^LAP|^$/.test(gap)
    ? 0
    : /L/.test(gap)
      ? null
      : lapSeconds(gap.replace("+", ""));

const signed = (n: number, unit: (a: number) => string) =>
  `${n < 0 ? "-" : "+"}${unit(Math.abs(n))}`;

const relativeGap = (r: Row, to: Row): string => {
  const laps = (r.lapsBehind ?? 0) - (to.lapsBehind ?? 0);
  if (laps) return signed(laps, (a) => `${a} LAP${a > 1 ? "S" : ""}`);
  const a = gapSeconds(r.gap);
  const b = gapSeconds(to.gap);
  return a === null || b === null ? "" : signed(a - b, (d) => d.toFixed(3));
};

export const relativeTo = (rows: Row[], number: string | undefined): Row[] => {
  const at = rows.findIndex((r) => r.number === number);
  if (at < 0) return rows;
  return rows.map((r, i) => ({
    ...r,
    gap: i === at ? "" : relativeGap(r, rows[at]!),
    interval:
      i < at
        ? rows[i + 1]!.interval.replace(/^\+?(?=.)/, "-")
        : i > at
          ? r.interval
          : "",
  }));
};

export type Tone = "car" | "bad" | "warn" | "good" | "time";

const TONES: [Tone, string][] = [
  ["car", String.raw`\b\d{1,2} \([A-Z]{3}\)`],
  ["time", String.raw`\b\d{1,2}:\d{2}\.\d{3}\b`],
  ["good", "NO FURTHER (?:ACTION|INVESTIGATION)|REINSTATED|OPEN|ENABLED"],
  [
    "bad",
    String.raw`(?:\d+ SECOND )?(?:TIME |STOP\/GO |DRIVE THROUGH )?PENALTY|DELETED|DISQUALIFIED|CLOSED|DISABLED`,
  ],
  [
    "warn",
    "UNDER INVESTIGATION|WILL BE INVESTIGATED AFTER THE (?:RACE|SESSION)|NOTED|REVIEWED|(?:VIRTUAL )?SAFETY CAR|VSC|SLIPPERY",
  ],
];

const TOKEN = new RegExp(
  String.raw`(?<![:.])\b(?:${TONES.map(([, p]) => `(${p})`).join("|")})(?![A-Z])`,
  "g",
);

export const highlight = (text: string): { text: string; tone?: Tone }[] =>
  text.split(TOKEN).reduce<{ text: string; tone?: Tone }[]>((out, s, i) => {
    const k = i % (TONES.length + 1);
    if (s) out.push(k ? { text: s, tone: TONES[k - 1]![0] } : { text: s });
    return out;
  }, []);

export const qualifyingPart = (state: Obj): string | null =>
  state.SessionInfo?.Type === "Qualifying" && state.TimingData?.SessionPart
    ? `${/Sprint/.test(state.SessionInfo.Name) ? "SQ" : "Q"}${state.TimingData.SessionPart}`
    : null;

export const sectorSplits = (bests: SessionBests): number[] => {
  const [a, b, c] = bests.sectors.map((s) => lapSeconds(s?.value ?? "") ?? 0);
  return a && b && c ? [a / (a + b + c), (a + b) / (a + b + c)] : [];
};
