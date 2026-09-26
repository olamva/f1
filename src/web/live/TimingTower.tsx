import { ArrowDown, ArrowUp, Timer } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { relativeTo, type Mark, type Row, type SessionBests } from "./view.ts";

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
  qualifying: boolean;
  bests: SessionBests;
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

interface Swap {
  up: boolean;
  id: number;
}

const LIFT = {
  zIndex: 2,
  backgroundColor: "#27272a",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.5)",
};

const swapFrames = (dy: number, up: boolean): Keyframe[] => {
  const scale = up ? 1.04 : 1;
  const layer = up ? LIFT : { zIndex: 1 };
  return [
    { ...layer, transform: `translateY(${dy}px) scale(1)` },
    {
      ...layer,
      transform: `translateY(${dy}px) scaleY(${scale})`,
      offset: 0.25,
    },
    { ...layer, transform: `translateY(0) scaleY(${scale})`, offset: 0.75 },
    { ...layer, transform: "translateY(0) scale(1)" },
  ];
};

const useSwaps = (rows: Row[]) => {
  const nodes = useRef(new Map<string, HTMLTableRowElement>());
  const last = useRef(new Map<string, { position: number; top: number }>());
  const count = useRef(0);
  const [swaps, setSwaps] = useState<Record<string, Swap>>({});

  useLayoutEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const moved: Record<string, Swap> = {};
    for (const row of rows) {
      const node = nodes.current.get(row.number);
      const before = last.current.get(row.number);
      if (!node) continue;
      last.current.set(row.number, {
        position: row.position,
        top: node.offsetTop,
      });
      if (!before || before.position === row.position) continue;
      const up = row.position < before.position;
      moved[row.number] = { up, id: ++count.current };
      if (!still)
        node.animate(swapFrames(before.top - node.offsetTop, up), {
          duration: 650,
          easing: "ease-in-out",
        });
    }
    if (Object.keys(moved).length) setSwaps((s) => ({ ...s, ...moved }));
  }, [rows]);

  const bind = (number: string) => (node: HTMLTableRowElement | null) => {
    if (node) nodes.current.set(number, node);
    else nodes.current.delete(number);
  };

  return { swaps, bind };
};

const SwapArrow = ({ swap }: { swap?: Swap }) => (
  <span className="inline-block w-3">
    {swap && (
      <span
        key={swap.id}
        className={`swap-arrow ${swap.up ? "text-emerald-400" : "text-red-500"}`}
      >
        {swap.up ? (
          <ArrowUp size={12} strokeWidth={3} />
        ) : (
          <ArrowDown size={12} strokeWidth={3} />
        )}
      </span>
    )}
  </span>
);

interface TowerRowProps {
  row: Row;
  race: boolean;
  qualifying: boolean;
  lapOwner: boolean;
  selected: boolean;
  relative: boolean;
  swap?: Swap;
  bind: (node: HTMLTableRowElement | null) => void;
  onToggle: () => void;
}

const TowerRow = ({
  row,
  race,
  qualifying,
  lapOwner,
  selected,
  relative,
  swap,
  bind,
  onToggle,
}: TowerRowProps) => (
  <tr
    ref={bind}
    onClick={onToggle}
    className={`relative cursor-pointer border-t border-zinc-800 hover:bg-zinc-800/60 ${selected ? "bg-zinc-800" : ""} ${row.status === "OUT" ? "opacity-40" : ""}`}
  >
    <td className="px-1 py-1 text-right text-zinc-400 sm:px-2">
      <span className="inline-flex items-center gap-1">
        <SwapArrow swap={swap} />
        {row.position}
      </span>
    </td>
    <td className="px-1 py-1 sm:px-2">
      <span className="flex items-center gap-2">
        <span
          className="h-4 w-1 rounded-sm"
          style={{ background: row.color }}
        />
        <span className="font-semibold" title={row.name}>
          {row.tla}
        </span>
        {lapOwner && (
          <span
            className="bg-purple flex size-4 items-center justify-center rounded-sm text-white"
            title="Fastest lap owner"
            aria-label="Fastest lap owner"
          >
            <Timer className="size-3" strokeWidth={2.5} />
          </span>
        )}
      </span>
    </td>
    {race && (
      <td
        className={`hidden px-1 py-1 text-right sm:table-cell sm:px-2 ${row.gained ? (row.gained > 0 ? "text-emerald-400" : "text-red-500") : "text-zinc-500"}`}
      >
        {row.gained === null
          ? ""
          : row.gained
            ? `${row.gained > 0 ? "▲" : "▼"}${Math.abs(row.gained)}`
            : "–"}
      </td>
    )}
    <td className="px-1 py-1 text-right sm:px-2">
      {row.position === 1 && race && !relative ? "Leader" : row.gap}
    </td>
    {race && (
      <td className="px-1 py-1 text-right text-zinc-400 sm:px-2">
        {row.interval}
      </td>
    )}
    <td className={`px-1 py-1 text-right sm:px-2 ${MARK[row.lastMark]}`}>
      {row.lastLap}
    </td>
    <td className="hidden px-1 py-1 text-right text-zinc-300 sm:table-cell sm:px-2">
      {row.bestLap}
    </td>
    {!race && (
      <td className="px-1 py-1 sm:px-2">
        <span className="flex gap-1.5">
          {row.sectors.map((s, i) => (
            <span
              key={i}
              title={s.value}
              className={`flex flex-col gap-0.5 ${qualifying ? "min-w-5 sm:min-w-17" : "min-w-5"}`}
            >
              <span
                className={`${qualifying ? "h-3.5 text-center text-[10px] leading-3.5 font-semibold" : "h-2"} ${BAR[s.mark]} ${s.mark === "none" ? "text-white" : "text-black"}`}
              >
                {qualifying && (
                  <span className="hidden sm:inline">{s.value}</span>
                )}
              </span>
              <span className="flex gap-px">
                {s.segments.map((m, j) => (
                  <span key={j} className={`h-1 w-1.5 ${BAR[m]}`} />
                ))}
              </span>
            </span>
          ))}
        </span>
      </td>
    )}
    <td className="px-1 py-1 sm:px-2">
      <Tyre compound={row.tyre} age={row.tyreAge} />
    </td>
    <td className="hidden px-1 py-1 text-right text-zinc-400 sm:table-cell sm:px-2">
      {row.pits || ""}
    </td>
    <td className="px-1 py-1 text-xs text-zinc-400 sm:px-2">{row.status}</td>
  </tr>
);

export const TimingTower = ({
  rows,
  race,
  qualifying,
  bests,
  selected,
  onToggle,
}: TimingTowerProps) => {
  const { swaps, bind } = useSwaps(rows);
  const relative = relativeTo(rows, [...selected][0]);
  return (
    <div className="bg-surface overflow-x-auto rounded-xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-800 px-3 py-2 font-mono text-xs">
        <span className="font-sans font-semibold tracking-wide text-zinc-500 uppercase">
          Session best
        </span>
        {[...bests.sectors, bests.lap].map((best, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-zinc-500">
              {i === 3 ? "Lap" : `S${i + 1}`}
            </span>
            {best ? (
              <span className="font-semibold">
                <span style={{ color: best.color }}>{best.tla}</span>{" "}
                <span className="text-purple">{best.value}</span>
              </span>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </span>
        ))}
      </div>
      <table className="tabular w-full font-mono text-xs sm:text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="px-1 py-2 text-right sm:px-2">P</th>
            <th className="px-1 py-2 sm:px-2">Driver</th>
            {race && (
              <th
                className="hidden px-1 py-2 text-right sm:table-cell sm:px-2"
                title="Places gained or lost since the start"
              >
                +/−
              </th>
            )}
            <th className="px-1 py-2 text-right sm:px-2">
              {race ? "Gap" : "Diff"}
            </th>
            {race && <th className="px-1 py-2 text-right sm:px-2">Int</th>}
            <th className="px-1 py-2 text-right sm:px-2">Last</th>
            <th className="hidden px-1 py-2 text-right sm:table-cell sm:px-2">
              Best
            </th>
            {!race && <th className="px-1 py-2 sm:px-2">Sectors</th>}
            <th className="px-1 py-2 sm:px-2">Tyre</th>
            <th className="hidden px-1 py-2 text-right sm:table-cell sm:px-2">
              Pit
            </th>
            <th className="px-1 py-2 sm:px-2" />
          </tr>
        </thead>
        <tbody>
          {relative.map((r) => (
            <TowerRow
              key={r.number}
              row={r}
              race={race}
              qualifying={qualifying}
              lapOwner={bests.lap?.number === r.number}
              selected={selected.has(r.number)}
              relative={relative !== rows}
              swap={swaps[r.number]}
              bind={bind(r.number)}
              onToggle={() => onToggle(r.number)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
