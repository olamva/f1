import { Play } from "lucide-react";
import type { SessionRef } from "../../shared/timing.ts";
import { Flag } from "../Flag.tsx";

interface ReplayPickerProps {
  sessions: SessionRef[];
  onStart: (session: SessionRef) => void;
}

interface SessionButtonProps {
  session: SessionRef;
  onStart: (session: SessionRef) => void;
  featured?: boolean;
}

interface WeekendProps extends ReplayPickerProps {
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
          <p className="text-xs font-semibold tracking-wider text-red-400 uppercase">
            Latest race weekend
          </p>
        )}
        <h2
          className={`truncate font-semibold ${featured ? "text-lg font-bold sm:text-2xl" : ""}`}
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

export const ReplayPicker = ({ sessions, onStart }: ReplayPickerProps) => (
  <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
    {weekends(sessions).map((w, i) => (
      <li key={w[0].start} className={i === 0 ? "sm:col-span-full" : ""}>
        <Weekend sessions={w} onStart={onStart} featured={i === 0} />
      </li>
    ))}
  </ul>
);
