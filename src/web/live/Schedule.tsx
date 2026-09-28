import type { Round } from "../../shared/season.ts";
import { Flag } from "../Flag.tsx";
import { LABEL } from "./Countdown.tsx";

interface ScheduleProps {
  rounds: Round[];
}

interface WeekendProps {
  round: Round;
  featured?: boolean;
}

const sessions = (round: Round) =>
  Object.entries(round.sessions)
    .filter((e): e is [string, string] => e[1] !== null)
    .map(([key, at]) => ({ key, at: new Date(at) }))
    .sort((a, b) => +a.at - +b.at);

const dates = (round: Round) => {
  const all = sessions(round);
  return new Intl.DateTimeFormat([], {
    day: "numeric",
    month: "short",
  }).formatRange(all[0].at, all.at(-1)!.at);
};

const time = (at: Date) =>
  at.toLocaleTimeString([], {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  });

const Weekend = ({ round, featured }: WeekendProps) => (
  <article
    className={`h-full space-y-3 rounded-xl ${featured ? "to-surface bg-gradient-to-r from-red-700/40 p-5" : "bg-surface p-4"}`}
  >
    <header className="flex items-baseline justify-between gap-2">
      <div className="min-w-0">
        <p
          className={`text-xs font-semibold tracking-wider uppercase ${featured ? "text-red-400" : "text-zinc-500"}`}
        >
          {featured ? "Next race weekend" : `Round ${round.round}`}
        </p>
        <h2
          className={`truncate font-semibold ${featured ? "text-lg font-bold sm:text-2xl" : ""}`}
        >
          <Flag country={round.country} />
          {round.name}
        </h2>
        <p className="truncate text-xs text-zinc-400">{round.circuit}</p>
      </div>
      <span
        className={`shrink-0 text-xs ${featured ? "text-zinc-300" : "text-zinc-500"}`}
      >
        {dates(round)}
      </span>
    </header>
    <ul
      className={`space-y-1 ${featured ? "sm:grid sm:auto-cols-fr sm:grid-flow-col sm:gap-3 sm:space-y-0" : ""}`}
    >
      {sessions(round).map((s) => (
        <li
          key={s.key}
          className={`flex items-baseline gap-2 ${featured ? "sm:block sm:rounded-md sm:bg-zinc-800/60 sm:px-3 sm:py-2" : ""}`}
        >
          <span
            className={`w-8 shrink-0 text-xs ${featured ? "text-zinc-300 sm:block sm:w-auto" : "text-zinc-500"}`}
          >
            {s.at.toLocaleDateString([], { weekday: "short" })}
          </span>
          <span className={`grow ${featured ? "sm:block sm:font-medium" : ""}`}>
            {LABEL[s.key] ?? s.key}
          </span>
          <span
            className={`tabular font-mono text-xs ${featured ? "text-zinc-300 sm:block sm:text-sm" : "text-zinc-400"}`}
          >
            {time(s.at)}
          </span>
        </li>
      ))}
    </ul>
  </article>
);

export const Schedule = ({ rounds }: ScheduleProps) => {
  const upcoming = rounds.filter(
    (r) => sessions(r).length && +sessions(r)[0].at > Date.now(),
  );
  return upcoming.length ? (
    <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {upcoming.map((r, i) => (
        <li key={r.round} className={i === 0 ? "sm:col-span-full" : ""}>
          <Weekend round={r} featured={i === 0} />
        </li>
      ))}
    </ul>
  ) : null;
};
