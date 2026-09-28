import { useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import {
  simulate,
  type Championship,
  type Standing,
  type Upcoming,
} from "../../shared/clinch.ts";
import { Flag } from "../Flag.tsx";
import type { Who } from "./derive.ts";

interface SimulatorProps {
  champ: Championship;
  table: Standing[];
  events: Upcoming[];
  contenders: string[];
  who: Map<string, Who>;
}

type Row = Record<string, (number | undefined)[]>;

const POSITIONS = Array.from({ length: 22 }, (_, i) => i + 1);

const place = (
  row: Row = {},
  id: string,
  car: number,
  p: number | undefined,
): Row => {
  const next = Object.fromEntries(
    Object.entries(row).map(([k, ps]) => [
      k,
      ps.map((x) => (p !== undefined && x === p ? undefined : x)),
    ]),
  );
  const slots = [...(next[id] ?? [])];
  slots[car] = p;
  return { ...next, [id]: slots };
};

interface SlotProps {
  value: number | undefined | "mixed";
  owners: Map<number, string>;
  highlight?: boolean;
  onChange: (p: number | undefined) => void;
}

const Slot = ({ value, owners, highlight, onChange }: SlotProps) => (
  <select
    value={value ?? ""}
    onChange={(e) =>
      onChange(e.target.value ? Number(e.target.value) : undefined)
    }
    className={`tabular w-16 cursor-pointer rounded-md px-1.5 py-1 text-xs ring-1 ring-zinc-700 focus:ring-zinc-400 focus:outline-none ${highlight ? "bg-zinc-700" : "bg-zinc-800"} ${value === undefined ? "text-zinc-500" : "text-zinc-100"}`}
  >
    <option value="">—</option>
    {value === "mixed" && (
      <option value="mixed" hidden>
        Mixed
      </option>
    )}
    {POSITIONS.map((p) => (
      <option key={p} value={p}>
        {owners.has(p) ? `P${p} (${owners.get(p)})` : `P${p}`}
      </option>
    ))}
  </select>
);

export const Simulator = ({
  champ,
  table,
  events,
  contenders,
  who,
}: SimulatorProps) => {
  const [grid, setGrid] = useState<Row[]>([]);
  const cars = champ === "drivers" ? 1 : 2;
  const code = (id: string) => who.get(id)?.code ?? id;
  const set = (
    only: number | null,
    id: string,
    car: number,
    p: number | undefined,
  ) =>
    setGrid((g) =>
      events.map((_, i) =>
        only === null || only === i ? place(g[i], id, car, p) : (g[i] ?? {}),
      ),
    );
  const sweep = (id: string) =>
    setGrid((g) =>
      events.map((_, i) =>
        Array.from({ length: cars }).reduce<Row>(
          (row, _, car) => place(row, id, car, car + 1),
          g[i] ?? {},
        ),
      ),
    );
  const clean = grid.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([id, ps]) => [
        id,
        ps.filter((p): p is number => p !== undefined),
      ]),
    ),
  );
  const result = simulate(table, events, clean, champ);
  const decided = result.decided;
  const owners = (i: number, id: string) =>
    new Map(
      Object.entries(clean[i] ?? {})
        .filter(([k]) => k !== id)
        .flatMap(([k, ps]) => ps.map((p) => [p, code(k)] as const)),
    );
  const common = (id: string, car: number) => {
    const all = events.map((_, i) => grid[i]?.[id]?.[car]);
    return all.every((v) => v === all[0]) ? all[0] : "mixed";
  };
  const standings = result.final.filter((s) => contenders.includes(s.id));
  const leader = standings[0]?.points ?? 0;
  return (
    <section className="bg-surface space-y-3 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Simulator
        </h2>
        <button
          onClick={() => setGrid([])}
          disabled={!grid.length}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs disabled:opacity-40"
        >
          <RotateCcw aria-hidden="true" className="size-3" />
          Reset
        </button>
      </div>
      <p className="text-sm text-zinc-500">
        Set finishes for the contenders. Use the All events row to set a result
        for every event. A contender with no finish scores nothing in that
        event.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Quick fill</span>
        {contenders.map((id) => (
          <button
            key={id}
            onClick={() => sweep(id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs hover:bg-zinc-700"
          >
            <span
              className="h-3 w-1 rounded-sm"
              style={{ background: who.get(id)?.color }}
            />
            {code(id)} wins all
          </button>
        ))}
      </div>
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${decided ? "bg-emerald-950 text-emerald-300" : "bg-zinc-800/60 text-zinc-300"}`}
      >
        <Trophy aria-hidden="true" className="size-4 shrink-0" />
        {decided
          ? `${who.get(decided.id)?.name ?? decided.id} is champion after ${events[decided.index]!.name}.`
          : "With these results, the title is not decided before the final event."}
      </div>
      <ol className="tabular grid gap-1 text-sm sm:grid-cols-2">
        {standings.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-md bg-zinc-800/40 px-2 py-1"
          >
            <span className="w-4 text-right text-xs text-zinc-500">
              {i + 1}
            </span>
            <span
              className="h-4 w-1 rounded-sm"
              style={{ background: who.get(s.id)?.color }}
            />
            <span className="truncate">{who.get(s.id)?.name ?? s.id}</span>
            <span className="ml-auto font-semibold">{s.points}</span>
            <span className="w-10 text-right text-xs text-zinc-500">
              {i ? `−${leader - s.points}` : ""}
            </span>
          </li>
        ))}
      </ol>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="bg-surface sticky left-0 z-10 p-1 text-left text-xs font-normal text-zinc-500">
                Event
              </th>
              {contenders.map((id) => (
                <th key={id} className="p-1 text-xs text-zinc-300">
                  <span className="flex items-center justify-center gap-1.5">
                    <span
                      className="h-3 w-1 rounded-sm"
                      style={{ background: who.get(id)?.color }}
                    />
                    {code(id)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-zinc-800">
              <td className="sticky left-0 z-10 rounded-l-md bg-zinc-800 p-1 pr-3 text-xs font-semibold whitespace-nowrap text-zinc-300">
                All events
              </td>
              {contenders.map((id, n) => (
                <td
                  key={id}
                  className={`p-1 ${n === contenders.length - 1 ? "rounded-r-md" : ""}`}
                >
                  <span className="flex justify-center gap-1">
                    {Array.from({ length: cars }, (_, car) => (
                      <Slot
                        key={car}
                        value={common(id, car)}
                        owners={new Map()}
                        highlight
                        onChange={(p) => set(null, id, car, p)}
                      />
                    ))}
                  </span>
                </td>
              ))}
            </tr>
            {events.map((e, i) => (
              <tr
                key={`${e.round}-${e.kind}`}
                className={`border-t border-zinc-800 ${decided && i > decided.index ? "opacity-40" : ""}`}
              >
                <td
                  className={`bg-surface sticky left-0 z-10 max-w-36 truncate p-1 pr-3 text-xs whitespace-nowrap sm:max-w-none ${decided?.index === i ? "font-semibold text-emerald-400" : "text-zinc-400"}`}
                >
                  <Flag country={e.country} />
                  {e.name}
                  {decided?.index === i && (
                    <Trophy
                      aria-label="Title decided"
                      className="ml-1 inline size-3"
                    />
                  )}
                </td>
                {contenders.map((id) => (
                  <td key={id} className="p-1">
                    <span className="flex justify-center gap-1">
                      {Array.from({ length: cars }, (_, car) => (
                        <Slot
                          key={car}
                          value={grid[i]?.[id]?.[car]}
                          owners={owners(i, id)}
                          onChange={(p) => set(i, id, car, p)}
                        />
                      ))}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
