import type { Mark, Row } from "./view.ts";

const MARK: Record<Mark, string> = {
  overall: "text-purple",
  personal: "text-emerald-400",
  normal: "text-yellow-300",
  none: "text-zinc-600",
};

const BAR: Record<Mark, string> = {
  overall: "bg-purple",
  personal: "bg-emerald-500",
  normal: "bg-yellow-400",
  none: "bg-zinc-700",
};

const TYRE: Record<string, string> = {
  SOFT: "text-red-500 border-red-500",
  MEDIUM: "text-yellow-300 border-yellow-300",
  HARD: "text-zinc-100 border-zinc-100",
  INTERMEDIATE: "text-emerald-400 border-emerald-400",
  WET: "text-sky-400 border-sky-400",
};

interface TimingTowerProps {
  rows: Row[];
  race: boolean;
  selected: Set<string>;
  onToggle: (number: string) => void;
}

interface TyreProps {
  compound: string;
  age: number | null;
}

const Tyre = ({ compound, age }: TyreProps) =>
  compound ? (
    <span className="flex items-center gap-1">
      <span
        className={`grid size-5 place-items-center rounded-full border-2 text-[10px] font-bold ${TYRE[compound] ?? "border-zinc-500 text-zinc-400"}`}
      >
        {compound[0]}
      </span>
      <span className="text-zinc-400">{age ?? ""}</span>
    </span>
  ) : null;

interface TowerRowProps {
  row: Row;
  race: boolean;
  selected: boolean;
  onToggle: () => void;
}

const TowerRow = ({ row, race, selected, onToggle }: TowerRowProps) => (
  <tr
    onClick={onToggle}
    className={`cursor-pointer border-t border-zinc-800 hover:bg-zinc-800/60 ${selected ? "bg-zinc-800" : ""} ${row.status === "OUT" ? "opacity-40" : ""}`}
  >
    <td className="px-2 py-1 text-right text-zinc-400">{row.position}</td>
    <td className="px-2 py-1">
      <span className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-sm" style={{ background: row.color }} />
        <span className="font-semibold" title={row.name}>{row.tla}</span>
      </span>
    </td>
    <td className="px-2 py-1 text-right">{row.position === 1 && race ? "Leader" : row.gap}</td>
    {race && <td className="px-2 py-1 text-right text-zinc-400">{row.interval}</td>}
    <td className={`px-2 py-1 text-right ${MARK[row.lastMark]}`}>{row.lastLap}</td>
    <td className="px-2 py-1 text-right text-zinc-300">{row.bestLap}</td>
    <td className="px-2 py-1">
      <span className="flex gap-0.5">
        {row.sectors.map((s, i) => (
          <span key={i} title={s.value} className={`h-2 w-5 rounded-sm ${BAR[s.mark]}`} />
        ))}
      </span>
    </td>
    <td className="px-2 py-1"><Tyre compound={row.tyre} age={row.tyreAge} /></td>
    <td className="px-2 py-1 text-right text-zinc-400">{row.pits || ""}</td>
    <td className="px-2 py-1 text-xs text-zinc-400">{row.status}</td>
  </tr>
);

export const TimingTower = ({ rows, race, selected, onToggle }: TimingTowerProps) => (
  <div className="overflow-x-auto rounded-xl bg-surface">
    <table className="tabular w-full font-mono text-sm">
      <thead className="text-left text-xs text-zinc-500">
        <tr>
          <th className="px-2 py-2 text-right">P</th>
          <th className="px-2 py-2">Driver</th>
          <th className="px-2 py-2 text-right">{race ? "Gap" : "Diff"}</th>
          {race && <th className="px-2 py-2 text-right">Int</th>}
          <th className="px-2 py-2 text-right">Last</th>
          <th className="px-2 py-2 text-right">Best</th>
          <th className="px-2 py-2">Sectors</th>
          <th className="px-2 py-2">Tyre</th>
          <th className="px-2 py-2 text-right">Pit</th>
          <th className="px-2 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <TowerRow
            key={r.number}
            row={r}
            race={race}
            selected={selected.has(r.number)}
            onToggle={() => onToggle(r.number)}
          />
        ))}
      </tbody>
    </table>
  </div>
);
