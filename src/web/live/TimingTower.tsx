import { ArrowDown, ArrowUp, ChevronsUp, Timer, Zap } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { FAVOURITE_ROW, useFavourite } from "../favourite.ts";
import { Tabs } from "../Tabs.tsx";
import { TeamLogo } from "../TeamLogo.tsx";
import type { Rejoin } from "./rejoin.ts";
import { Cover, Stints, TyreCells, useCover } from "./TowerTyres.tsx";
import { BestRow } from "./BestRow.tsx";
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

interface TimingTowerProps {
  rows: Row[];
  race: boolean;
  qualifying: boolean;
  bests: SessionBests;
  cut: number | null;
  selected: Set<string>;
  pit: Rejoin | null;
  onToggle: (number: string) => void;
}

const VIEWS = ["Timing", "Tyres"] as const;

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

interface CallProps {
  title?: string;
  tone: string;
}

const Call = ({ title, tone }: CallProps) =>
  title ? (
    <span
      className={`flex size-4 items-center justify-center rounded-sm text-xs font-bold ${tone}`}
      title={title}
      aria-label={title}
    >
      !
    </span>
  ) : null;

interface PitLineProps {
  label: string;
  color: string;
  last: boolean;
}

const PitLine = ({ label, color, last }: PitLineProps) => (
  <span
    className={`pointer-events-none absolute inset-x-0 h-px ${last ? "bottom-0" : "top-0"}`}
    style={{ backgroundColor: color }}
  >
    <span
      className="bg-surface absolute top-1/2 left-2 -translate-y-1/2 rounded-sm border px-1 text-[10px] leading-2.5 font-semibold"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  </span>
);

interface SectorsProps {
  sectors: Row["sectors"];
  qualifying: boolean;
}

const Sectors = ({ sectors, qualifying }: SectorsProps) => (
  <span className="flex gap-1 sm:gap-1.5">
    {sectors.map((s, i) => (
      <span
        key={i}
        title={s.value}
        className={`flex w-5 min-w-5 flex-col gap-0.5 sm:w-auto ${qualifying ? "sm:min-w-17" : ""}`}
      >
        <span
          className={`${qualifying ? "h-3.5 text-center text-[10px] leading-3.5 font-semibold" : "h-2"} ${BAR[s.mark]} ${s.mark === "none" ? "text-white" : "text-black"}`}
        >
          {qualifying && <span className="hidden sm:inline">{s.value}</span>}
        </span>
        <span className="flex sm:gap-px">
          {s.segments.map((m, j) => (
            <span
              key={j}
              className={`h-1 min-w-0 flex-1 sm:min-w-1.5 ${BAR[m]}`}
            />
          ))}
        </span>
      </span>
    ))}
  </span>
);

interface TowerRowProps {
  row: Row;
  race: boolean;
  qualifying: boolean;
  lapOwner: boolean;
  selected: boolean;
  favourite: boolean;
  relative: boolean;
  tyres: boolean;
  scale: number;
  swap?: Swap;
  bind: (node: HTMLTableRowElement | null) => void;
  onToggle: () => void;
  children?: React.ReactNode;
}

const TowerRow = ({
  row,
  race,
  qualifying,
  lapOwner,
  selected,
  favourite,
  relative,
  tyres,
  scale,
  swap,
  bind,
  onToggle,
  children,
}: TowerRowProps) => (
  <tr
    ref={bind}
    onClick={onToggle}
    className={`relative cursor-pointer border-t border-zinc-800 hover:bg-zinc-800/60 ${selected ? "bg-zinc-800" : favourite ? FAVOURITE_ROW : ""} ${row.status === "OUT" ? "opacity-40" : ""}`}
  >
    <td className="px-1 py-1 text-right text-zinc-400 sm:px-2">
      {children}
      <span className="flex items-center justify-between gap-1">
        <SwapArrow swap={swap} />
        {row.position}
      </span>
    </td>
    <td className="px-1 py-1 sm:px-2">
      <span className="flex w-max items-center gap-2">
        <TeamLogo team={row.team} className="hidden h-4 w-6 sm:block" />
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
        <Call title={row.investigation} tone="bg-yellow-400 text-black" />
        <Call title={row.penalty} tone="bg-red-600 text-white" />
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
    <td className="box-content w-[8ch] px-1 py-1 text-right sm:px-2">
      {row.position === 1 && race && !relative ? "Leader" : row.gap}
    </td>
    {race && (
      <td className="box-content w-[calc(7ch+2rem)] px-1 py-1 text-right text-zinc-400 sm:px-2">
        <span className="flex items-center justify-between gap-1">
          <span className="flex gap-1">
            <span className="inline-block w-3">
              {row.catching && (
                <span
                  className="inline-flex text-emerald-400"
                  title="Catching the car ahead"
                  aria-label="Catching the car ahead"
                >
                  <ChevronsUp size={12} strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="inline-block w-3">
              {row.overtake && (
                <span
                  className="inline-flex text-yellow-300"
                  title="Overtake Mode"
                  aria-label="Overtake Mode"
                >
                  <Zap size={12} strokeWidth={3} fill="currentColor" />
                </span>
              )}
            </span>
          </span>
          {row.interval}
        </span>
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
        {tyres && <Stints stints={row.stints} scale={scale} />}
        <div className={tyres ? "invisible" : undefined}>
          <Sectors sectors={row.sectors} qualifying={qualifying} />
        </div>
      </td>
    )}
    <TyreCells row={row} race={race} tyres={tyres} scale={scale} />
    <td className="px-1 py-1 text-xs text-zinc-400 sm:px-2">{row.status}</td>
  </tr>
);

export const TimingTower = ({
  rows,
  race,
  qualifying,
  bests,
  cut,
  selected,
  pit,
  onToggle,
}: TimingTowerProps) => {
  const { swaps, bind } = useSwaps(rows);
  const favourite = useFavourite();
  const relative = relativeTo(rows, [...selected][0]);
  const [view, setView] = useState<(typeof VIEWS)[number]>("Timing");
  const tyres = view === "Tyres";
  const cover = race && tyres ? "invisible" : "";
  const table = useCover();
  const scale = Math.max(
    1,
    ...rows.map((r) => r.stints.reduce((total, s) => total + s.laps, 0)),
  );
  const widths = [0, 1, 2].map((i) =>
    Math.max(0, ...rows.map((r) => r.sectors[i]?.segments.length ?? 0)),
  );
  const bestRow = !race && !tyres;
  const strip = bestRow ? "sm:hidden" : "sm:contents";
  return (
    <div className="bg-surface overflow-x-auto rounded-xl pb-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-800 px-2 py-2 text-xs sm:px-3">
        <Tabs items={VIEWS} value={view} onChange={setView} small />
        <span
          className={`font-f1 tracking-wider text-zinc-500 uppercase ${bestRow ? "sm:hidden" : ""}`}
        >
          Session best
        </span>
        <div
          className={`flex w-full flex-wrap justify-between text-[10px] sm:w-auto sm:text-xs ${strip}`}
        >
          {[...bests.sectors, bests.lap].map((best, i) => (
            <span
              key={i}
              className="flex items-center gap-0.5 font-mono sm:gap-1.5"
            >
              <span className="text-zinc-500">
                {i === 3 ? "Lap" : `S${i + 1}`}
              </span>
              {best ? (
                <span className="flex gap-1 font-semibold sm:gap-[1ch]">
                  <span style={{ color: best.color }}>{best.tla}</span>
                  <span className="text-purple">{best.value}</span>
                </span>
              ) : (
                <span className="text-zinc-600">—</span>
              )}
            </span>
          ))}
        </div>
      </div>
      <table
        ref={table}
        className="tabular w-full font-mono text-xs sm:text-sm"
      >
        <thead className="text-left text-xs text-zinc-500">
          <tr className="relative">
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
            <th
              className="px-1 py-2 text-right sm:px-2"
              title={cut ? `Gap to the time of P${cut}` : undefined}
            >
              {race ? "Gap" : cut ? "Cut" : "Diff"}
            </th>
            {race && <th className="px-1 py-2 text-right sm:px-2">Int</th>}
            <th className="px-1 py-2 text-right sm:px-2">Last</th>
            <th className="hidden px-1 py-2 text-right sm:table-cell sm:px-2">
              Best
            </th>
            {!race && (
              <th
                data-tyres
                className={`px-1 py-2 sm:px-2 ${tyres ? "invisible" : ""}`}
              >
                {tyres && <Cover>Stints</Cover>}
                Sectors
              </th>
            )}
            <th
              data-tyres={race || undefined}
              className={`px-1 py-2 sm:table-cell sm:px-2 ${race ? "" : "hidden"} ${cover}`}
            >
              {cover && <Cover>Stints</Cover>}
              Tyre
            </th>
            <th
              data-tyres={race || undefined}
              className={`hidden px-1 py-2 text-right sm:table-cell sm:px-2 ${cover}`}
            >
              Pits
            </th>
            <th
              data-tyres={race || undefined}
              className={`hidden px-1 py-2 text-right sm:table-cell sm:px-2 ${cover}`}
              title="Stationary time of the last pit stop"
            >
              Stop
            </th>
            <th className="px-1 py-2 sm:px-2" />
          </tr>
        </thead>
        <tbody>
          {bestRow && (
            <BestRow bests={bests} widths={widths} qualifying={qualifying} />
          )}
          {relative.map((r, i) => (
            <TowerRow
              key={r.number}
              row={r}
              race={race}
              qualifying={qualifying}
              lapOwner={bests.lap?.number === r.number}
              selected={selected.has(r.number)}
              favourite={r.tla === favourite?.code}
              relative={relative !== rows}
              tyres={tyres}
              scale={scale}
              swap={swaps[r.number]}
              bind={bind(r.number)}
              onToggle={() => onToggle(r.number)}
            >
              {pit && i === Math.min(pit.before, rows.length - 1) && (
                <PitLine
                  label={pit.label}
                  color={pit.color}
                  last={pit.before === rows.length}
                />
              )}
              {i + 1 === cut && <PitLine label="KO" color="#ef4444" last />}
            </TowerRow>
          ))}
        </tbody>
      </table>
    </div>
  );
};
