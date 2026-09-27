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

const weekends = (sessions: SessionRef[]) =>
  sessions
    .reduce<SessionRef[][]>((all, s) => {
      if (all.at(-1)?.[0].meeting === s.meeting) all.at(-1)!.push(s);
      else all.push([s]);
      return all;
    }, [])
    .reverse();

const day = (s: SessionRef) => new Date(s.start.slice(0, 10));

const dates = (sessions: SessionRef[]) =>
  new Intl.DateTimeFormat([], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatRange(day(sessions[0]), day(sessions.at(-1)!));

const SessionButton = ({ session, onStart, featured }: SessionButtonProps) => {
  const label = (
    <>
      <Play aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{session.name}</span>
      {featured && (
        <span className="ml-auto text-xs text-zinc-400 group-hover/session:text-red-100">
          {day(session).toLocaleDateString([], {
            weekday: "short",
            timeZone: "UTC",
          })}
        </span>
      )}
    </>
  );
  const size = featured ? "px-3.5 py-2.5" : "px-2.5 py-1";
  return session.path ? (
    <button
      onClick={() => onStart(session)}
      aria-label={`Start replay: ${session.meeting} · ${session.name}`}
      className={`group/session flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-800 transition-colors hover:bg-red-600 ${size}`}
    >
      {label}
    </button>
  ) : (
    <span className="group/pending relative flex">
      <button
        aria-disabled="true"
        aria-describedby={`pending-${session.start}`}
        className={`striped-border flex grow cursor-not-allowed items-center gap-1.5 rounded-lg text-zinc-500 ${size}`}
      >
        {label}
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
};

export const ReplayPicker = ({ sessions, onStart }: ReplayPickerProps) => {
  const [latest, ...earlier] = weekends(sessions);
  return (
    latest && (
      <div className="space-y-6 text-sm">
        <section className="bg-surface relative overflow-hidden rounded-2xl border border-zinc-800 p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_0%_0%,rgb(185_28_28/0.3),transparent)]" />
          <div className="relative space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-red-400 uppercase">
                Latest weekend
              </p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                <Flag country={latest[0].country} />
                {latest[0].meeting}
              </h2>
              <p className="mt-1 text-zinc-400">{dates(latest)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {latest.map((s) => (
                <SessionButton
                  key={s.start}
                  session={s}
                  onStart={onStart}
                  featured
                />
              ))}
            </div>
          </div>
        </section>
        {earlier.length > 0 && (
          <section className="space-y-3">
            <h2 className="px-1 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              Earlier this season
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {earlier.map((w) => (
                <li
                  key={w[0].start}
                  className="bg-surface space-y-3 rounded-xl border border-zinc-800/60 p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate font-semibold">
                      <Flag country={w[0].country} />
                      {w[0].meeting}
                    </h3>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {dates(w)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {w.map((s) => (
                      <SessionButton
                        key={s.start}
                        session={s}
                        onStart={onStart}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  );
};
