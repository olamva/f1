import { Play } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Round } from "../../shared/season.ts";
import type { SessionRef } from "../../shared/timing.ts";
import { Flag } from "../Flag.tsx";
import { ScheduleWeekend, upcoming } from "./Schedule.tsx";

interface CalendarListProps {
  sessions: SessionRef[];
  rounds: Round[];
  onStart: (session: SessionRef) => void;
}

interface SessionButtonProps {
  session: SessionRef;
  onStart: (session: SessionRef) => void;
  featured?: boolean;
}

interface WeekendProps {
  sessions: SessionRef[];
  onStart: (session: SessionRef) => void;
  featured?: boolean;
}

const day = (s: SessionRef) => new Date(s.start.slice(0, 10));

const weekends = (sessions: SessionRef[]) =>
  sessions
    .reduce<SessionRef[][]>((all, s) => {
      const last = all.at(-1)?.at(-1);
      if (last?.meeting === s.meeting && +day(s) - +day(last) < 4 * 864e5)
        all.at(-1)!.push(s);
      else all.push([s]);
      return all;
    }, [])
    .reverse();

const ongoing = (sessions: SessionRef[]) =>
  !sessions.some((s) => s.name === "Race") &&
  Date.now() - +day(sessions[0]) < 4 * 864e5;

const dates = (sessions: SessionRef[]) =>
  new Intl.DateTimeFormat([], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatRange(day(sessions[0]), day(sessions.at(-1)!));

const SessionButton = ({ session, onStart, featured }: SessionButtonProps) =>
  session.path ? (
    <button
      onClick={() => onStart(session)}
      aria-label={`Start replay: ${session.meeting} · ${session.name}`}
      className={`flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-red-600 ${featured ? "px-3.5 py-2 font-medium" : "px-2.5 py-1"}`}
    >
      <Play aria-hidden="true" className="size-3.5 shrink-0" />
      {session.name}
    </button>
  ) : (
    <span className="group/pending relative flex">
      <button
        aria-disabled="true"
        aria-describedby={`pending-${session.start}`}
        className={`striped-border flex grow cursor-not-allowed items-center gap-1.5 rounded-md text-zinc-500 ${featured ? "px-3.5 py-2 font-medium" : "px-2.5 py-1"}`}
      >
        <Play aria-hidden="true" className="size-3.5 shrink-0" />
        {session.name}
      </button>
      <span
        id={`pending-${session.start}`}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-300 opacity-0 shadow-lg group-focus-within/pending:opacity-100 group-hover/pending:opacity-100"
      >
        Session replay is not available yet.
      </span>
    </span>
  );

const weekday = (s: SessionRef, weekday: "long" | "short") =>
  day(s).toLocaleDateString([], { weekday, timeZone: "UTC" });

const Weekend = ({ sessions, onStart, featured }: WeekendProps) => (
  <article
    className={`h-full space-y-3 rounded-xl ${featured ? "to-surface bg-gradient-to-r from-red-700/40 p-5" : "bg-surface p-4"}`}
  >
    <header className="flex items-baseline justify-between gap-2">
      <div className="min-w-0">
        {featured && (
          <p className="font-f1 text-xs tracking-wider text-red-400 uppercase">
            Current race weekend
          </p>
        )}
        <h2
          className={`font-f1 line-clamp-2 ${featured ? "text-lg sm:text-2xl sm:font-bold" : "font-bold"}`}
        >
          <Flag country={sessions[0].country} />
          {sessions[0].meeting}
        </h2>
      </div>
      <span
        className={`shrink-0 text-xs ${featured ? "text-zinc-300" : "text-zinc-500"}`}
      >
        {dates(sessions)}
      </span>
    </header>
    <div
      className={`space-y-2 ${featured ? "sm:grid sm:auto-cols-fr sm:grid-flow-col sm:gap-3 sm:space-y-0" : ""}`}
    >
      {Object.values(Object.groupBy(sessions, (s) => s.start.slice(0, 10))).map(
        (group) => (
          <div
            key={group![0].start}
            className={`flex items-center gap-2 ${featured ? "sm:block sm:space-y-1.5" : ""}`}
          >
            <h3
              className={`w-8 shrink-0 text-xs ${featured ? "text-zinc-300 sm:w-auto" : "text-zinc-500"}`}
            >
              {featured && (
                <span className="max-sm:hidden">
                  {weekday(group![0], "long")}
                </span>
              )}
              <span className={featured ? "sm:hidden" : ""}>
                {weekday(group![0], "short")}
              </span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {group!.map((s) => (
                <SessionButton
                  key={s.start}
                  session={s}
                  onStart={onStart}
                  featured={featured}
                />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  </article>
);

const SM_SPAN = ["", "sm:col-span-2"];
const LG_SPAN = ["lg:col-span-2", "lg:col-span-6", "lg:col-span-3"];

const leftover = (i: number, at: number, total: number, cols: number) => {
  const tail = i > at;
  const size = tail ? total - at - 1 : at;
  const pos = tail ? i - at - 1 : i;
  const rest = size % cols;
  return (tail ? pos >= size - rest : pos < rest) ? rest : 0;
};

export const CalendarList = ({
  sessions,
  rounds,
  onStart,
}: CalendarListProps) => {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center" });
  }, []);
  const past = weekends(sessions);
  const future = upcoming(rounds).reverse();
  const anchor =
    past[0] && ongoing(past[0]) ? past[0][0].start : future.at(-1)?.name;
  const keys = [...future.map((r) => r.name), ...past.map((w) => w[0].start)];
  const at = keys.indexOf(anchor ?? "");
  const item = (key: string) => {
    const i = keys.indexOf(key);
    return {
      ref: key === anchor ? ref : undefined,
      className:
        key === anchor
          ? "sm:col-span-full"
          : `${SM_SPAN[leftover(i, at, keys.length, 2)]} ${LG_SPAN[leftover(i, at, keys.length, 3)]}`,
    };
  };
  return (
    <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
      {future.map((r) => (
        <li key={r.name} {...item(r.name)}>
          <ScheduleWeekend round={r} featured={r.name === anchor} />
        </li>
      ))}
      {past.map((w) => (
        <li key={w[0].start} {...item(w[0].start)}>
          <Weekend
            sessions={w}
            onStart={onStart}
            featured={w[0].start === anchor}
          />
        </li>
      ))}
    </ul>
  );
};
