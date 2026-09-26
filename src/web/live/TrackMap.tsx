import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Crown, Maximize, Minimize } from "lucide-react";
import type { Outline } from "../../shared/timing.ts";
import type { PositionTrail } from "./useFeed.ts";
import { sectorSplits, type Row, type SessionBests } from "./view.ts";

const SIZE = 1000;
const PAD = 60;

interface TrackMapProps {
  outline: Outline | null;
  positions: Record<string, [number, number]> | undefined;
  rows: Row[];
  bests: SessionBests;
  race: boolean;
  selected: Set<string>;
  onToggle: (number: string) => void;
  note: string | null;
  positionTrail?: PositionTrail;
  speed?: number;
  banner?: React.ReactNode;
}

const projector = (outline: Outline) => {
  const a = (outline.rotation * Math.PI) / 180;
  const turn = (x: number, y: number): [number, number] => [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a),
  ];
  const pts = outline.x.map((x, i) => turn(x, outline.y[i]!));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const scale = (SIZE - 2 * PAD) / Math.max(maxX - minX, maxY - minY);
  const offX = (SIZE - (maxX - minX) * scale) / 2;
  const offY = (SIZE - (maxY - minY) * scale) / 2;
  const box = [
    offX - PAD,
    offY - PAD,
    SIZE - 2 * offX + 2 * PAD,
    SIZE - 2 * offY + 2 * PAD,
  ] as const;
  const project = (x: number, y: number): [number, number] => {
    const [u, v] = turn(x, y);
    return [offX + (u - minX) * scale, SIZE - (offY + (v - minY) * scale)];
  };
  return { project, box };
};

const indexAt = (progress: number[], fraction: number) =>
  Math.max(
    0,
    progress.findIndex(
      (t) => t >= progress[0]! + fraction * (progress.at(-1)! - progress[0]!),
    ),
  );

const markers = (
  outline: Outline,
  project: (x: number, y: number) => [number, number],
  fractions: number[],
) => {
  const points = outline.x.map((x, i) => project(x, outline.y[i]!));
  const n = points.length;
  const at = (i: number) => points[(i + n) % n]!;
  const normal = (i: number): [number, number] => {
    const [ax, ay] = at(i - 3);
    const [bx, by] = at(i + 3);
    const length = Math.hypot(bx - ax, by - ay) || 1;
    return [(ay - by) / length, (bx - ax) / length];
  };
  const across = (
    i: number,
    offset: number,
  ): [number, number, number, number] => {
    const [nx, ny] = normal(i);
    return [...at(i), nx * offset, ny * offset];
  };
  const placed: [number, number, number][] = [];
  const clearance = (x: number, y: number, width: number) =>
    Math.min(
      ...points.map(
        ([px, py]) =>
          Math.max(Math.abs(px - x) - width / 2, Math.abs(py - y) - 11) - 9,
      ),
      ...placed.map(([px, py, w]) =>
        Math.max(Math.abs(px - x) - (width + w) / 2, Math.abs(py - y) - 22),
      ),
    );
  const beside = (i: number, width: number, shifts = [0]): [number, number] => {
    const [x, y] = shifts
      .flatMap((shift) => {
        const [x, y] = at(i + shift);
        const [nx, ny] = normal(i + shift);
        const d = 16 + (Math.abs(nx) * width) / 2 + Math.abs(ny) * 11;
        return [d, -d].map((k) => {
          const p: [number, number] = [x + nx * k, y + ny * k];
          return { p, score: clearance(...p, width) - Math.abs(shift) / n };
        });
      })
      .reduce((best, c) => (c.score > best.score ? c : best)).p;
    placed.push([x, y, width]);
    return [x, y];
  };
  let distance = 0;
  const progress = outline.time.length
    ? outline.time
    : points.map(([x, y], i) =>
        i ? (distance += Math.hypot(x - at(i - 1)[0], y - at(i - 1)[1])) : 0,
      );
  const bounds = [0, ...fractions, 1];
  return {
    finish: across(0, 20),
    splits: fractions.map((f) => across(indexAt(progress, f), 16)),
    corners: outline.corners.map((c) => {
      const [cx, cy] = project(c.x, c.y);
      const i = points.reduce(
        (best, [x, y], j) =>
          Math.hypot(x - cx, y - cy) <
          Math.hypot(points[best]![0] - cx, points[best]![1] - cy)
            ? j
            : best,
        0,
      );
      return { number: c.number, at: beside(i, 11 * String(c.number).length) };
    }),
    labels:
      bounds.length > 2
        ? bounds.slice(1).map((f, i) =>
            beside(
              indexAt(progress, (bounds[i]! + f) / 2),
              90,
              [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) =>
                Math.round((k * n) / 60),
              ),
            ),
          )
        : [],
  };
};

const Markers = ({
  finish,
  splits,
  labels,
  corners,
}: ReturnType<typeof markers>) => (
  <>
    {splits.map(([x, y, dx, dy], i) => (
      <line
        key={i}
        x1={x - dx}
        y1={y - dy}
        x2={x + dx}
        y2={y + dy}
        stroke="#a1a1aa"
        strokeWidth={4}
      />
    ))}
    {labels.map(([x, y], i) => (
      <text
        key={i}
        x={x}
        y={y}
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-zinc-400 text-[20px] font-semibold"
      >
        Sector {i + 1}
      </text>
    ))}
    {corners.map(({ number, at: [x, y] }) => (
      <text
        key={number}
        x={x}
        y={y}
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-zinc-300 text-[18px] font-semibold"
      >
        {number}
      </text>
    ))}
    <line
      x1={finish[0] - finish[2]}
      y1={finish[1] - finish[3]}
      x2={finish[0] + finish[2]}
      y2={finish[1] + finish[3]}
      stroke="#f4f4f5"
      strokeWidth={6}
    />
  </>
);

export const TrackMap = ({
  outline,
  positions,
  rows,
  bests,
  race,
  selected,
  onToggle,
  note,
  positionTrail,
  speed = 1,
  banner,
}: TrackMapProps) => {
  const frame = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const cars = useRef(new Map<string, SVGGElement>());
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef("");
  const [hover, setHover] = useState<{
    number: string;
    x: number;
    y: number;
  } | null>(null);
  const hovered = hover?.number ?? null;
  const card = rows.find((r) => r.number === hovered);
  const { project, box } = useMemo(
    () =>
      outline
        ? projector(outline)
        : { project: null, box: [0, 0, SIZE, SIZE] as const },
    [outline],
  );
  const path = useMemo(
    () =>
      outline && project
        ? outline.x
            .map((x, i) => project(x, outline.y[i]!).map(Math.round).join(","))
            .join(" ")
        : "",
    [outline, project],
  );
  const splits = sectorSplits(bests).join();
  const marks = useMemo(
    () =>
      project &&
      markers(outline!, project, splits.split(",").filter(Boolean).map(Number)),
    [outline, project, splits],
  );
  useLayoutEffect(() => {
    if (!project || !positionTrail || speed <= 1) return;
    for (const [number, car] of cars.current) {
      const points = [
        positionTrail.from[number],
        ...positionTrail.samples.map((sample) => sample[number]),
      ]
        .filter((p): p is [number, number] => !!p && (p[0] !== 0 || p[1] !== 0))
        .map(([x, y]) => project(x, y));
      if (points.length < 2) continue;
      car.getAnimations().forEach((animation) => animation.cancel());
      car.animate(
        points.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })),
        {
          duration: 250,
          easing: "linear",
        },
      );
    }
  }, [positionTrail, project, speed]);
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return (
    <div
      ref={frame}
      className={`bg-surface relative p-2 ${full ? "flex flex-col gap-2" : "rounded-xl"}`}
    >
      {full && banner}
      <button
        type="button"
        aria-label={full ? "Exit full screen" : "Show the map in full screen"}
        onClick={() =>
          full ? document.exitFullscreen() : frame.current!.requestFullscreen()
        }
        className="glass-gear absolute right-3 bottom-3 z-10 cursor-pointer p-2"
      >
        {full ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      <svg
        ref={svg}
        viewBox={box.join(" ")}
        className={full ? "min-h-0 w-full flex-1" : "aspect-square w-full"}
        onPointerMove={(event) => {
          const at = `${event.clientX},${event.clientY}`;
          if (at === pointer.current) return;
          pointer.current = at;
          const number = (event.target as Element)
            .closest("[data-number]")
            ?.getAttribute("data-number");
          const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
            svg.current!.getScreenCTM()!.inverse(),
          );
          setHover(number ? { number, x: p.x, y: p.y } : null);
        }}
        onPointerLeave={() => {
          pointer.current = "";
          setHover(null);
        }}
      >
        <polyline
          points={path}
          fill="none"
          stroke="#3f3f46"
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {marks && <Markers {...marks} />}
        {project &&
          [...rows].reverse().map((r) => {
            const p = positions?.[r.number];
            if (
              ["PIT", "KO", "OUT"].includes(r.status) ||
              !p ||
              (p[0] === 0 && p[1] === 0)
            )
              return null;
            const [x, y] = project(p[0], p[1]);
            const focus = selected.size === 0 || selected.has(r.number);
            return (
              <g
                key={r.number}
                ref={(node) => {
                  if (node) cars.current.set(r.number, node);
                  else cars.current.delete(r.number);
                }}
                data-number={r.number}
                role="button"
                tabIndex={0}
                aria-label={`Select ${r.name}`}
                aria-pressed={selected.has(r.number)}
                aria-describedby={
                  hovered === r.number ? "track-map-card" : undefined
                }
                onFocus={() =>
                  setHover((h) =>
                    h?.number === r.number ? h : { number: r.number, x, y },
                  )
                }
                onBlur={() => setHover(null)}
                onClick={() => onToggle(r.number)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggle(r.number);
                  }
                }}
                className="group cursor-pointer outline-none"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: speed > 1 ? "none" : "transform 1000ms linear",
                }}
                opacity={focus || hovered === r.number ? 1 : 0.35}
              >
                <circle
                  r={14}
                  fill={r.color}
                  stroke="#18181b"
                  strokeWidth={4}
                  className="group-focus-visible:stroke-zinc-100"
                />
                <text
                  y={-22}
                  textAnchor="middle"
                  className="fill-zinc-100 text-[22px] font-semibold"
                >
                  {r.tla}
                </text>
                {r.position === 1 && (race || r.bestLap) ? (
                  <Crown
                    x={-13}
                    y={-62}
                    width={26}
                    height={26}
                    className="stroke-yellow-300"
                    strokeWidth={2.5}
                  />
                ) : race && r.lapsBehind ? (
                  <text
                    y={-43}
                    textAnchor="middle"
                    className="fill-zinc-300 text-[21px] font-bold"
                  >
                    +{r.lapsBehind}
                  </text>
                ) : null}
              </g>
            );
          })}
        {hover && card && (
          <>
            <circle
              data-number={card.number}
              cx={hover.x}
              cy={hover.y}
              r={18}
              fill="transparent"
              className="cursor-pointer"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onToggle(card.number)}
            />
            <foreignObject
              x={hover.x > box[0] + box[2] / 2 ? hover.x - 340 : hover.x + 20}
              y={hover.y - 60}
              width={320}
              height={120}
              className="pointer-events-none overflow-visible"
            >
              <div
                id="track-map-card"
                className="rounded-lg border-l-8 bg-zinc-900 px-5 py-3 whitespace-nowrap shadow-lg"
                style={{ borderColor: card.color }}
              >
                <p className="text-[26px] font-semibold text-zinc-100">
                  {card.name}
                </p>
                <p className="text-[20px] text-zinc-400">{card.team}</p>
                <p className="mt-1 text-[18px] text-zinc-500">
                  {selected.size === 1 && selected.has(card.number)
                    ? "Click or press Enter to remove focus"
                    : "Click or press Enter to focus the map"}
                </p>
              </div>
            </foreignObject>
          </>
        )}
      </svg>
      {(note || !outline) && (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-zinc-400">
          {note ?? "The track outline shows after a few laps."}
        </p>
      )}
    </div>
  );
};
