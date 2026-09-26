import { useEffect, useState } from "react";
import type { Round } from "../../shared/season.ts";
import { Flag } from "../Flag.tsx";

const LABEL: Record<string, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprintQualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};
const MINUTES: Record<string, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprintQualifying: 45,
  sprint: 60,
  qualifying: 60,
  race: 120,
};

interface CountdownProps {
  rounds: Round[];
}

const next = (rounds: Round[], now: number) =>
  rounds
    .flatMap((r) =>
      Object.entries(r.sessions)
        .filter((e): e is [string, string] => e[1] !== null)
        .map(([k, at]) => ({
          round: r,
          label: LABEL[k] ?? k,
          at: Date.parse(at),
        })),
    )
    .filter((s) => s.at > now)
    .sort((a, b) => a.at - b.at)[0];

export const current = (rounds: Round[], now: number) =>
  rounds
    .flatMap((r) =>
      Object.entries(r.sessions)
        .filter((e): e is [string, string] => e[1] !== null)
        .map(([k, at]) => ({
          round: r,
          label: LABEL[k] ?? k,
          at: Date.parse(at),
          minutes: MINUTES[k] ?? 60,
        })),
    )
    .find(
      (s) =>
        now >= s.at - 15 * 60_000 && now <= s.at + (s.minutes + 30) * 60_000,
    );

const span = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return d ? `${d}d ${hms}` : hms;
};

export const Countdown = ({ rounds }: CountdownProps) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = next(rounds, now);
  if (!s) return null;
  return (
    <section className="isolate grid place-items-center gap-3 px-4 py-16 text-center">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-red-700/40 to-transparent" />
      <span className="text-sm tracking-widest text-zinc-300 uppercase">
        Next up
      </span>
      <h1 className="text-2xl font-bold sm:text-3xl">
        <Flag country={s.round.country} />
        {s.round.name} · {s.label}
      </h1>
      <span className="tabular font-mono text-6xl font-bold sm:text-8xl">
        {span(s.at - now)}
      </span>
      <span className="text-zinc-400">
        {new Date(s.at).toLocaleString([], {
          weekday: "long",
          day: "numeric",
          month: "long",
          hourCycle: "h23",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </section>
  );
};
