import { ChevronRight, Play } from "lucide-react";
import type { SessionRef } from "../../shared/timing.ts";
import { Flag } from "../Flag.tsx";

interface ReplayPickerProps {
  sessions: SessionRef[];
  onStart: (session: SessionRef) => void;
}

const weekends = (sessions: SessionRef[]) =>
  sessions
    .reduce<SessionRef[][]>((all, s) => {
      if (all.at(-1)?.[0].meeting === s.meeting) all.at(-1)!.push(s);
      else all.push([s]);
      return all;
    }, [])
    .reverse();

const Weekend = ({ sessions, onStart }: ReplayPickerProps) => (
  <div className="flex flex-wrap gap-2">
    {sessions.map((s) =>
      s.path ? (
        <button
          key={s.path}
          onClick={() => onStart(s)}
          aria-label={`Start replay: ${s.meeting} · ${s.name}`}
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 hover:bg-red-600"
        >
          <Play aria-hidden="true" className="size-3.5" />
          {s.name}
        </button>
      ) : (
        <span key={s.name} className="group/pending relative">
          <button
            aria-disabled="true"
            aria-describedby={`pending-${s.start}`}
            className="striped-border flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-zinc-500"
          >
            <Play aria-hidden="true" className="size-3.5" />
            {s.name}
          </button>
          <span
            id={`pending-${s.start}`}
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-300 opacity-0 shadow-lg group-focus-within/pending:opacity-100 group-hover/pending:opacity-100"
          >
            This session has ended. The replay is not available yet. Check again later.
          </span>
        </span>
      ),
    )}
  </div>
);

export const ReplayPicker = ({ sessions, onStart }: ReplayPickerProps) => {
  const [latest, ...earlier] = weekends(sessions);
  if (!latest) return null;
  return (
    <section className="space-y-3 rounded-xl bg-surface p-4 text-sm">
      <h2 className="font-semibold text-zinc-300">Watch a replay</h2>
      <div className="space-y-2">
        <h3 className="text-zinc-400"><Flag country={latest[0].country} />{latest[0].meeting}</h3>
        <Weekend sessions={latest} onStart={onStart} />
      </div>
      {earlier.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-zinc-400 hover:text-zinc-100">
            <ChevronRight aria-hidden="true" className="size-4 group-open:rotate-90" />
            Earlier race weekends
          </summary>
          <ul className="mt-2 space-y-1 pl-5">
            {earlier.map((w) => (
              <li key={w[0].path}>
                <details className="group/weekend">
                  <summary className="flex cursor-pointer list-none items-center gap-1 py-1 hover:text-zinc-100">
                    <ChevronRight aria-hidden="true" className="size-4 group-open/weekend:rotate-90" />
                    <Flag country={w[0].country} />
                    {w[0].meeting}
                  </summary>
                  <div className="py-2 pl-5">
                    <Weekend sessions={w} onStart={onStart} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};
