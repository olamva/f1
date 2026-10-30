import { useMemo, useState } from "react";
import { lapSeconds, type LapTrace, type Outline } from "../shared/timing.ts";
import { useJson } from "./api.ts";
import { LineChart } from "./charts/LineChart.tsx";
import {
  course,
  MINI_SECTORS,
  miniSector,
  miniSectors,
  STEP,
  trace,
  type Course,
} from "./compare.ts";
import { ink } from "./ink.ts";
import { Markers } from "./live/Markers.tsx";
import { markers } from "./live/outline.ts";
import { projector } from "./live/TrackMap.tsx";
import { Loading } from "./Loading.tsx";
import { Pick } from "./Pick.tsx";

export type CompareDriver = {
  number: string;
  tla: string;
  name: string;
  color: string;
  time: string;
  lap?: LapTrace;
  url?: string;
};

interface HeadingProps {
  children: React.ReactNode;
}

const Heading = ({ children }: HeadingProps) => (
  <h3 className="font-f1 mb-2 text-xs tracking-wider text-zinc-400 uppercase">
    {children}
  </h3>
);

interface DominanceProps {
  outline: Outline;
  course: Course;
  deltas: number[];
  pair: [CompareDriver, CompareDriver];
}

const Dominance = ({ outline, course, deltas, pair }: DominanceProps) => {
  const { box, marks, track, sectors } = useMemo(() => {
    const { project, box } = projector(outline, 0);
    const line = (points: [number, number][]) =>
      points.map(([x, y]) => project(x, y).map(Math.round).join(",")).join(" ");
    return {
      box,
      marks: markers(outline, project, []),
      track: line(outline.x.map((x, i) => [x, outline.y[i]!])),
      sectors: Array.from({ length: MINI_SECTORS }, (_, k) =>
        line(miniSector(course, k)),
      ),
    };
  }, [outline, course]);
  const wins = [deltas.filter((d) => d <= 0), deltas.filter((d) => d > 0)];
  return (
    <>
      <svg
        viewBox={box.join(" ")}
        role="img"
        aria-label={`Track dominance: ${pair.map((d, i) => `${d.tla} is faster in ${wins[i]!.length} of ${MINI_SECTORS} mini-sectors`).join(", ")}`}
        className="mx-auto block max-h-96 w-full overflow-visible"
      >
        <polyline
          points={track}
          fill="none"
          className="stroke-zinc-700"
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {deltas.map((d, k) => (
          <polyline
            key={k}
            points={sectors[k]}
            fill="none"
            stroke={ink(pair[d <= 0 ? 0 : 1].color)}
            strokeWidth={12}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <Markers {...marks} />
      </svg>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-300">
        {pair.map((d, i) => (
          <li key={d.number} className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={ink(d.color)}
                strokeWidth="4"
              />
            </svg>
            {d.tla} faster in {wins[i]!.length} of {MINI_SECTORS}
          </li>
        ))}
      </ul>
    </>
  );
};

interface PairProps {
  outline: Outline;
  pair: [CompareDriver, CompareDriver];
}

const WHITE = "#e4e4e7";
const GREY = "#71717a";

const apart = (a: string, b: string) => {
  if (a.toLowerCase() !== b.toLowerCase()) return b;
  const rgb = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  if (Math.max(...rgb) - Math.min(...rgb) >= 32) return WHITE;
  return `light-dark(#27272a, ${Math.min(...rgb) >= 192 ? GREY : WHITE})`;
};

const Pair = ({ outline, pair: [a, other] }: PairProps) => {
  const b = { ...other, color: apart(a.color, other.color) };
  const fetched = [
    useJson<LapTrace>(a.lap ? null : (a.url ?? null)),
    useJson<LapTrace>(b.lap ? null : (b.url ?? null)),
  ];
  const [lapA, lapB] = [a.lap ?? fetched[0]!.data, b.lap ?? fetched[1]!.data];
  const c = useMemo(() => course(outline), [outline]);
  const traceA = useMemo(() => lapA && trace(c, lapA), [c, lapA]);
  const traceB = useMemo(() => lapB && trace(c, lapB), [c, lapB]);
  if (!lapA || !lapB)
    return (
      <Loading
        label="Loading the telemetry…"
        error={fetched[0]!.error ?? fetched[1]!.error}
      />
    );
  if (!traceA || !traceB)
    return (
      <p className="text-sm text-zinc-500">
        The telemetry of {(traceA ? b : a).tla} is not complete for this lap.
      </p>
    );
  const gap = lapSeconds(b.time)! - lapSeconds(a.time)!;
  return (
    <div className="@container space-y-3">
      <p className="tabular text-sm text-zinc-300">
        {[a, b].map((d) => (
          <span key={d.number} className="mr-4 inline-block">
            <span className="font-f1 font-bold" style={{ color: ink(d.color) }}>
              {d.tla}
            </span>{" "}
            <span className="font-mono">{d.time}</span>
          </span>
        ))}
        <span className="font-mono text-zinc-400">
          {gap < 0 ? "−" : "+"}
          {Math.abs(gap).toFixed(3)}
        </span>
      </p>
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section>
          <Heading>Speed (km/h)</Heading>
          <LineChart
            series={[a, b].map((d, i) => ({
              id: d.number,
              label: d.tla,
              color: d.color,
              points: (i ? traceB : traceA).speed.map(
                (v, k) => [k * STEP, v] as [number, number],
              ),
            }))}
            xLabel="Distance (m)"
            endLabels={false}
          />
        </section>
        <section>
          <Heading>Track dominance</Heading>
          <Dominance
            outline={outline}
            course={c}
            deltas={miniSectors(traceA, traceB)}
            pair={[a, b]}
          />
        </section>
      </div>
    </div>
  );
};

interface LapCompareProps {
  outline: Outline | null;
  drivers: CompareDriver[];
}

export const LapCompare = ({ outline, drivers }: LapCompareProps) => {
  const [pick, setPick] = useState<string[]>([]);
  const by = new Map(drivers.map((d) => [d.number, d]));
  const ids = drivers.map((d) => d.number);
  const a = by.has(pick[0] ?? "") ? pick[0]! : ids[0];
  const b =
    by.has(pick[1] ?? "") && pick[1] !== a
      ? pick[1]!
      : ids.find((n) => n !== a);
  if (!outline || !a || !b)
    return (
      <p className="text-sm text-zinc-500">
        Two drivers need a timed lap with telemetry.
      </p>
    );
  const who = new Map(
    drivers.map((d) => [d.number, { name: `${d.name} · ${d.time}` }]),
  );
  return (
    <div className="space-y-3">
      <div className="grid max-w-lg grid-cols-2 gap-3">
        <Pick
          label="Driver"
          value={a}
          ids={ids}
          who={who}
          onChange={(n) => setPick([n, b])}
        />
        <Pick
          label="Against"
          value={b}
          ids={ids.filter((n) => n !== a)}
          who={who}
          onChange={(n) => setPick([a, n])}
        />
      </div>
      <Pair outline={outline} pair={[by.get(a)!, by.get(b)!]} />
    </div>
  );
};
