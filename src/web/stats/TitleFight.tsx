import { Fragment, useMemo, useState } from "react";
import {
  clinchMatrix,
  constructorNeeds,
  earliestClinch,
  isEliminated,
  maxGain,
  OUTSIDE,
  othersAfterWin,
  type Cell,
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
  <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-500">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer truncate rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-700 focus:ring-zinc-400 focus:outline-none"
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

const STYLE: Record<NonNullable<Cell>, string> = {
  clinched: "bg-emerald-600 font-semibold text-white",
  "rival-out": "bg-emerald-950 text-emerald-300",
  open: "bg-zinc-800/50 text-zinc-400",
};

const list = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
    : (items[0] ?? "");

const Matrix = ({ table, events, focus, rival, who }: MatrixProps) => {
  const m = useMemo(
    () => clinchMatrix(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const limits = useMemo(
    () => othersAfterWin(table, events, focus, rival),
    [table, events, focus, rival],
  );
  const code = (id: string) => who.get(id)?.code ?? id;
  const [a, b] = [code(focus), code(rival)];
  const states = new Set(m.cells.flat());
  const blocker = limits.find((l) => l.from === null);
  const gap =
    table.find((s) => s.id === focus)!.points -
    table.find((s) => s.id === rival)!.points;
  const margin = (mine: number | null, theirs: number) =>
    gap + pointsFor(events[0]!.kind, mine) - pointsFor(events[0]!.kind, theirs);
  const legend = {
    clinched: `${a} is champion`,
    "rival-out": `${b} is out, ${a} needs other results`,
    open: "Title still open",
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        {`Each cell shows ${a}'s lead over ${b} after ${events[0]!.name}. Negative numbers mean ${b} leads.`}
      </p>
      <div className="grid max-w-lg grid-cols-[auto_auto_repeat(11,minmax(0,1fr))] gap-0.5 text-[11px] tracking-tight">
        <span className="col-span-2" />
        <span className="col-span-11 pb-1 text-center text-[10px] tracking-wider text-zinc-500 uppercase">
          {b} finish
        </span>
        <span className="col-start-1 row-span-12 row-start-2 rotate-180 pl-1 text-center text-[10px] tracking-wider text-zinc-500 uppercase [writing-mode:vertical-rl]">
          {a} finish
        </span>
        <span />
        {m.theirs.map((t) => (
          <span
            key={t}
            className="pb-0.5 text-center text-[10px] text-zinc-500"
          >
            {t === OUTSIDE ? "P11+" : `P${t}`}
          </span>
        ))}
        {m.mine.map((mine, i) => (
          <Fragment key={String(mine)}>
            <span className="flex items-center justify-end pr-1 text-[10px] text-zinc-500">
              {mine === null ? "P11+" : `P${mine}`}
            </span>
            {m.cells[i]!.map((c, j) => {
              const n = margin(mine, m.theirs[j]!);
              return (
                <span
                  key={j}
                  title={
                    c === null
                      ? "Same finish position"
                      : `${a} ${pos(mine)}, ${b} ${pos(m.theirs[j]!)}: ${n} points. ${legend[c]}.`
                  }
                  className={`tabular flex h-7 items-center justify-center rounded ${c === null ? "" : STYLE[c]}`}
                >
                  {c === null ? "" : n < 0 ? `−${-n}` : n}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {(["clinched", "rival-out", "open"] as const)
          .filter((k) => states.has(k))
          .map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-sm ${STYLE[k]}`} />
              {legend[k]}
            </span>
          ))}
      </div>
      <p className="text-sm text-zinc-400">
        {blocker
          ? `${a} cannot secure the title at this event. ${code(blocker.id)} can still win the title with no points here.`
          : states.has("rival-out") && limits.length > 0
            ? `If ${a} wins, ${a} also needs ${list(limits.map((l) => `${code(l.id)} to finish P${l.from} or lower`))}.`
            : !states.has("clinched") &&
              `${a} cannot secure the title at this event.`}
      </p>
    </div>
  );
};

const Needs = ({ table, events, focus, rival, who }: MatrixProps) => {
  const needs = useMemo(
    () =>
      constructorNeeds(table, events, focus, rival).filter(
        (n, i, all) => n.need !== null && n.need !== all[i - 1]?.need,
      ),
    [table, events, focus, rival],
  );
  const [a, b] = [who.get(focus)?.name ?? focus, who.get(rival)?.name ?? rival];
  if (!needs.length)
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
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="py-1 pr-6">{b} score</th>
            <th className="py-1">{a} need</th>
          </tr>
        </thead>
        <tbody>
          {needs.map((n) => (
            <tr key={n.rival} className="border-t border-zinc-800">
              <td className="py-1 pr-6">
                {n.rival ? `${n.rival} or less` : 0}
              </td>
              <td className="py-1 font-semibold text-emerald-400">{n.need}</td>
            </tr>
          ))}
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
        <h2 className="font-f1 mb-1 text-xs tracking-wider text-zinc-400 uppercase">
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
          <h2 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
            What it takes at {events[0]!.name}
          </h2>
          <div className="grid max-w-lg grid-cols-2 gap-3">
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
