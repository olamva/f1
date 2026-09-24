import { writeFileSync } from "node:fs";

const MINUTES: Record<string, number> = {
  FirstPractice: 60,
  SecondPractice: 60,
  ThirdPractice: 60,
  SprintQualifying: 45,
  Sprint: 60,
  Qualifying: 60,
  Race: 120,
};
const BEFORE = 15;
const AFTER = 30;

const res = await fetch("https://api.jolpi.ca/ergast/f1/current.json?limit=100");
const races = (await res.json()).MRData.RaceTable.Races;
const days = new Map<string, { from: number; to: number }>();
for (const r of races) {
  for (const [key, minutes] of Object.entries(MINUTES)) {
    const s = key === "Race" ? r : r[key];
    if (!s?.date) continue;
    const start = Date.parse(`${s.date}T${s.time ?? "00:00:00Z"}`);
    if (start + minutes * 60_000 < Date.now()) continue;
    const day = s.date as string;
    const d = days.get(day) ?? { from: Infinity, to: -Infinity };
    days.set(day, {
      from: Math.min(d.from, start - BEFORE * 60_000),
      to: Math.max(d.to, start + (minutes + AFTER) * 60_000),
    });
  }
}
const cron = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCMinutes()} ${d.getUTCHours()} ${d.getUTCDate()} ${d.getUTCMonth() + 1} *`;
};
const windows = [...days].sort().map(([day, w]) => ({ name: `s-${day}`, start: cron(w.from), end: cron(w.to) }));
writeFileSync(new URL("../infra/sessions.json", import.meta.url), `${JSON.stringify(windows, null, 2)}\n`);
console.log(`${windows.length} session windows`);
