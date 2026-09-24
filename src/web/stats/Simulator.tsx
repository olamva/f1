import { useState } from "react";
import { simulate, type Championship, type Picks, type Standing, type Upcoming } from "../../shared/clinch.ts";
import type { Who } from "./derive.ts";

interface SimulatorProps {
  champ: Championship;
  table: Standing[];
  events: Upcoming[];
  contenders: string[];
  who: Map<string, Who>;
}

const POSITIONS = Array.from({ length: 22 }, (_, i) => i + 1);

interface SlotProps {
  value: number | undefined;
  taken: Set<number>;
  onChange: (p: number | undefined) => void;
}

const Slot = ({ value, taken, onChange }: SlotProps) => (
  <select
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
    className="w-14 rounded bg-zinc-800 px-1 py-0.5 text-xs"
  >
    <option value="">—</option>
    {POSITIONS.map((p) => (
      <option key={p} value={p} disabled={taken.has(p) && p !== value}>
        P{p}
      </option>
    ))}
  </select>
);

export const Simulator = ({ champ, table, events, contenders, who }: SimulatorProps) => {
  const [picks, setPicks] = useState<Picks>([]);
  const cars = champ === "drivers" ? 1 : 2;
  const set = (event: number, id: string, car: number, p: number | undefined) =>
    setPicks((all) => {
      const next = [...all];
      const row = { ...next[event] };
      const slots = [...(row[id] ?? [])];
      slots[car] = p as number;
      row[id] = slots;
      next[event] = row;
      return next;
    });
  const clean: Picks = picks.map((row) =>
    Object.fromEntries(Object.entries(row ?? {}).map(([id, ps]) => [id, ps.filter((p) => p !== undefined && p !== null)])),
  );
  const result = simulate(table, events, clean, champ);
  const decided = result.decided;
  return (
    <section className="rounded-xl bg-surface p-3">
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Simulator</h2>
        <button onClick={() => setPicks([])} className="ml-auto rounded bg-zinc-800 px-2 py-0.5 text-xs">
          Reset
        </button>
      </div>
      <p className="mb-3 text-sm text-zinc-500">
        Set finishes for the contenders. A contender with no finish scores nothing in that event.
      </p>
      <p className="mb-3 text-base">
        {decided
          ? `${who.get(decided.id)?.name ?? decided.id} is champion after ${events[decided.index]!.name}.`
          : "With these results, the title is not decided before the final event."}
      </p>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="p-1 text-left text-xs text-zinc-500">Event</th>
              {contenders.map((id) => (
                <th key={id} className="p-1 text-xs text-zinc-300">{who.get(id)?.code ?? id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const taken = new Set(Object.values(clean[i] ?? {}).flat());
              return (
                <tr key={`${e.round}-${e.kind}`} className={`border-t border-zinc-800 ${decided && i > decided.index ? "opacity-40" : ""}`}>
                  <td className="p-1 pr-3 text-xs whitespace-nowrap text-zinc-400">{e.name}</td>
                  {contenders.map((id) => (
                    <td key={id} className="p-1">
                      <span className="flex gap-1">
                        {Array.from({ length: cars }, (_, car) => (
                          <Slot key={car} value={picks[i]?.[id]?.[car]} taken={taken} onChange={(p) => set(i, id, car, p)} />
                        ))}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t border-zinc-600 font-semibold">
              <td className="p-1 text-xs text-zinc-400">Final points</td>
              {contenders.map((id) => (
                <td key={id} className="tabular p-1 text-center">{result.final.find((s) => s.id === id)?.points}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
