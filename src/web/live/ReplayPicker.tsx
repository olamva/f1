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

const SessionButton = ({ session, onStart }: SessionButtonProps) =>
  session.path ? (
    <button
      onClick={() => onStart(session)}
      aria-label={`Start replay: ${session.meeting} · ${session.name}`}
      className="flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 hover:bg-red-600"
    >
      <Play aria-hidden="true" className="size-3.5 shrink-0" />
      {session.name}
    </button>
  ) : (
    <span className="group/pending relative flex">
      <button
        aria-disabled="true"
        aria-describedby={`pending-${session.start}`}
        className="striped-border flex grow cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1 text-zinc-500"
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

const Weekend = ({ sessions, onStart, featured }: WeekendProps) => (
  <article className="bg-surface h-full space-y-3 rounded-xl p-4">
    <header className="flex items-baseline justify-between gap-2">
      <h3 className={`truncate font-semibold ${featured ? "text-lg" : ""}`}>
        <Flag country={sessions[0].country} />
        {sessions[0].meeting}
      </h3>
      <span className="shrink-0 text-xs text-zinc-500">{dates(sessions)}</span>
    </header>
    <div
      className={
        featured ? "grid gap-3 sm:auto-cols-fr sm:grid-flow-col" : "space-y-2"
      }
    >
      {Object.values(Object.groupBy(sessions, (s) => s.start.slice(0, 10))).map(
        (group) => (
          <div
            key={group![0].start}
            className={featured ? "space-y-1.5" : "flex items-center gap-2"}
          >
            <h4
              className={`shrink-0 text-xs text-zinc-500 ${featured ? "" : "w-8"}`}
            >
              {day(group![0]).toLocaleDateString([], {
                weekday: featured ? "long" : "short",
                timeZone: "UTC",
              })}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {group!.map((s) => (
                <SessionButton key={s.start} session={s} onStart={onStart} />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  </article>
);

export const ReplayPicker = ({ sessions, onStart }: ReplayPickerProps) => {
  const [latest, ...earlier] = weekends(sessions);
  return (
    latest && (
      <div className="space-y-6 text-sm">
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Latest weekend
          </h2>
          <Weekend sessions={latest} onStart={onStart} featured />
        </section>
        {earlier.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Earlier this season
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {earlier.map((w) => (
                <li key={w[0].start}>
                  <Weekend sessions={w} onStart={onStart} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  );
};
