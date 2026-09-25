import { useMemo, useState } from "react";
import {
  clinchMatrix,
  constructorNeeds,
  earliestClinch,
  isEliminated,
  maxGain,
  OUTSIDE,
  type Championship,
  type Earliest,
  type Standing,
  type Upcoming,
} from "../../shared/clinch.ts";
import { pointsFor } from "../../shared/points.ts";
import { Simulator } from "./Simulator.tsx";
import type { Who } from "./derive.ts";

interface TitleFightProps {
  champ: Championship;
  table: Standing[];
  events: Upcoming[];
  who: Map<string, Who>;
}

const earliestText = (e: Earliest, events: Upcoming[]): string =>
  e.state === "clinched"
    ? "Champion"
    : e.state === "eliminated"
      ? "Out of contention"
      : e.state === "last-race-only"
        ? "Only on a tie-break"
        : `${events[e.index]!.name} (round ${events[e.index]!.round})`;

interface PickProps {
  label: string;
  value: string;
  ids: string[];
  who: Map<string, Who>;
  onChange: (id: string) => void;
}

const Pick = ({ label, value, ids, who, onChange }: PickProps) => (
  <label className="flex items-center gap-2 text-sm text-zinc-400">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-100"
    >
      {ids.map((id) => (
        <option key={id} value={id}>
          {who.get(id)?.name ?? id}
        </option>
      ))}
    </select>
  </label>
);

interface MatrixProps {
  table: Standing[];
  events: Upcoming[];
  focus: string;
  rival: string;
  who: Map<string, Who>;
}

const pos = (p: number | null) =>
  p === null ? "P11+ / DNF" : p === OUTSIDE ? "P11+" : `P${p}`;

const Matrix = ({ table, events, focus, rival, who }: MatrixProps) => {
  const m = useMemo(
    () => clinchMatrix(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const any = m.cells.some((r) => r.some(Boolean));
  const [a, b] = [who.get(focus)?.code ?? focus, who.get(rival)?.code ?? rival];
  const gap =
    table.find((s) => s.id === focus)!.points -
    table.find((s) => s.id === rival)!.points;
  const margin = (mine: number | null, theirs: number) =>
    gap + pointsFor(events[0]!.kind, mine) - pointsFor(events[0]!.kind, theirs);
  return (
    <div>
      <p className="mb-2 text-sm text-zinc-400">
        {`Each cell shows ${a}'s points gap to ${b} after ${events[0]!.name}. Positive numbers mean ${a} leads. `}
        {any
          ? `Green means ${a} secures the title. Other drivers take the best free position.`
          : `${a} cannot secure the title at this event.`}
      </p>
      <div className="overflow-x-auto">
        <table className="tabular text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left text-zinc-500">
                {a} ↓ / {b} →
              </th>
              {m.theirs.map((t) => (
                <th key={t} className="p-1 text-zinc-400">
                  {pos(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.mine.map((mine, i) => (
              <tr key={String(mine)}>
                <th className="p-1 text-right text-zinc-400">{pos(mine)}</th>
                {m.cells[i]!.map((c, j) => (
                  <td key={j} className="p-0.5">
                    <div
                      title={
                        c === null
                          ? "Same finish position"
                          : `${a} ${pos(mine)}, ${b} ${pos(m.theirs[j]!)}: ${margin(mine, m.theirs[j]!)} points${c ? " (title secured)" : ""}`
                      }
                      className={`flex size-9 items-center justify-center rounded ${c === null ? "" : c ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-200"}`}
                    >
                      {c === null
                        ? ""
                        : margin(mine, m.theirs[j]!) > 0
                          ? `+${margin(mine, m.theirs[j]!)}`
                          : margin(mine, m.theirs[j]!)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Needs = ({ table, events, focus, rival, who }: MatrixProps) => {
  const needs = useMemo(
    () => constructorNeeds(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const [a, b] = [who.get(focus)?.name ?? focus, who.get(rival)?.name ?? rival];
  if (needs.every((n) => n.need === null))
    return (
      <p className="text-sm text-zinc-400">
        {a} cannot secure the title at {events[0]!.name}.
      </p>
    );
  return (
    <div>
      <p className="mb-2 text-sm text-zinc-400">
        The points {a} need at {events[0]!.name} to be champion there, for each
        score of {b}. This assumes that every other team can still score the
        maximum.
      </p>
      <table className="tabular text-sm">
        <tbody>
          <tr>
            <th className="pr-3 text-left text-zinc-400">{b} score</th>
            {needs.map((n) => (
              <td key={n.rival} className="px-1.5 text-center">
                {n.rival}
              </td>
            ))}
          </tr>
          <tr>
            <th className="pr-3 text-left text-zinc-400">{a} need</th>
            {needs.map((n) => (
              <td
                key={n.rival}
                className={`px-1.5 text-center font-semibold ${n.need === null ? "text-zinc-600" : "text-emerald-400"}`}
              >
                {n.need ?? "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const TitleFight = ({ champ, table, events, who }: TitleFightProps) => {
  const alive = table
    .filter((s) => !isEliminated(table, events, s.id, champ))
    .map((s) => s.id);
  const [focus, setFocus] = useState(alive[0] ?? "");
  const [picked, setRival] = useState(alive[1] ?? "");
  const rival =
    picked !== focus ? picked : (alive.find((id) => id !== focus) ?? "");
  const gain = maxGain(events, champ);
  if (!events.length)
    return <p className="text-zinc-400">The season is over.</p>;
  return (
    <div className="space-y-4">
      <section className="bg-surface rounded-xl p-3">
        <h2 className="mb-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Who can still win
        </h2>
        <p className="mb-2 text-sm text-zinc-500">
          {gain} points remain across {events.length} events. The earliest
          decider assumes that the driver wins every event and that no rival
          scores.
        </p>
        <table className="tabular w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-1" />
              <th className="py-1 pl-3 text-right">Points</th>
              <th className="py-1 pl-3 text-right">Max</th>
              <th className="py-1 pl-4">Earliest title</th>
            </tr>
          </thead>
          <tbody>
            {table.slice(0, 10).map((s) => (
              <tr
                key={s.id}
                className={`border-t border-zinc-800 ${alive.includes(s.id) ? "" : "text-zinc-600"}`}
              >
                <td className="py-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-1 rounded-sm"
                      style={{ background: who.get(s.id)?.color }}
                    />
                    {who.get(s.id)?.name ?? s.id}
                  </span>
                </td>
                <td className="py-1 pl-3 text-right">{s.points}</td>
                <td className="py-1 pl-3 text-right">{s.points + gain}</td>
                <td className="py-1 pl-4">
                  {earliestText(
                    earliestClinch(table, events, s.id, champ),
                    events,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {alive.length > 1 && (
        <section className="bg-surface space-y-3 rounded-xl p-3">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            What it takes at {events[0]!.name}
          </h2>
          <div className="flex flex-wrap gap-4">
            <Pick
              label="Title for"
              value={focus}
              ids={alive}
              who={who}
              onChange={setFocus}
            />
            <Pick
              label="Against"
              value={rival}
              ids={alive.filter((id) => id !== focus)}
              who={who}
              onChange={setRival}
            />
          </div>
          {champ === "drivers" ? (
            <Matrix
              table={table}
              events={events}
              focus={focus}
              rival={rival}
              who={who}
            />
          ) : (
            <Needs
              table={table}
              events={events}
              focus={focus}
              rival={rival}
              who={who}
            />
          )}
        </section>
      )}
      <Simulator
        champ={champ}
        table={table}
        events={events}
        contenders={alive}
        who={who}
      />
    </div>
  );
};
