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
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-300 opacity-0 shadow-lg group-focus-within/pending:opacity-100 group-hover/pending:opacity-100"
          >
            Session replay is not available yet.
          </span>
        </span>
      ),
    )}
  </div>
);

export const ReplayPicker = ({ sessions, onStart }: ReplayPickerProps) =>
  sessions.length > 0 && (
    <section className="bg-surface space-y-3 rounded-xl p-4 text-sm">
      <h2 className="font-semibold text-zinc-300">Watch a replay</h2>
      <ul className="space-y-1">
        {weekends(sessions).map((w, i) => (
          <li key={w[0].start}>
            <details open={i === 0} className="group/weekend">
              <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-zinc-400 hover:text-zinc-100">
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 group-open/weekend:rotate-90"
                />
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
    </section>
  );
