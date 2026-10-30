import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Crown } from "lucide-react";
import { ink } from "../ink.ts";
import { MapFrame } from "./MapFrame.tsx";
import type { Outline, Telemetry } from "../../shared/timing.ts";
import type { PositionTrail } from "./useFeed.ts";
import { useCarMotion } from "./useCarMotion.ts";
import { MapCard } from "./MapCard.tsx";
import { Markers } from "./Markers.tsx";
import { CAR, MapPin, RING, tag, type Frame } from "./MapPin.tsx";
import { SectorFlags } from "./SectorFlags.tsx";
import { markers, nearest } from "./outline.ts";
import type { Rejoin } from "./rejoin.ts";
import { sectorSplits, type Row, type SessionBests } from "./view.ts";

const SIZE = 1000;
const PAD = 60;
const TAG = 70;

type Positions = Record<string, [number, number]>;

interface TrackMapProps {
  outline: Outline | null;
  positions: Positions | undefined;
  telemetry: Record<string, Telemetry> | undefined;
  rows: Row[];
  bests: SessionBests;
  race: boolean;
  selected: Set<string>;
  pit: Rejoin | null;
  onToggle: (number: string) => void;
  note: string | null;
  positionTrail?: PositionTrail;
  time: number;
  speed?: number;
  stream?: string;
  banner?: React.ReactNode;
  flags: Map<number, string>;
}

export const projector = (outline: Outline, tag = TAG) => {
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
    offX - PAD - tag,
    offY - PAD,
    SIZE - 2 * offX + 2 * PAD + tag,
    SIZE - 2 * offY + 2 * PAD,
  ] as const;
  const project = (x: number, y: number): [number, number] => {
    const [u, v] = turn(x, y);
    return [offX + (u - minX) * scale, SIZE - (offY + (v - minY) * scale)];
  };
  return { project, box };
};

export const TrackMap = ({
  outline,
  positions,
  telemetry,
  rows,
  bests,
  race,
  selected,
  pit,
  onToggle,
  note,
  positionTrail,
  time,
  speed = 1,
  stream,
  banner,
  flags,
}: TrackMapProps) => {
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<HTMLDivElement>(null);
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
  const cardX =
    hover && (hover.x > box[0] + box[2] / 2 ? hover.x - 260 : hover.x + 20);
  const [path, lane] = useMemo(() => {
    const trace = (line: { x: number[]; y: number[] } | null | undefined) =>
      line && project
        ? line.x
            .map((x, i) => project(x, line.y[i]!).map(Math.round).join(","))
            .join(" ")
        : "";
    return [trace(outline), trace(outline?.pit)];
  }, [outline, project]);
  const splits = sectorSplits(bests).join();
  const marks = useMemo(
    () =>
      project &&
      markers(outline!, project, splits.split(",").filter(Boolean).map(Number)),
    [outline, project, splits],
  );
  const cars = project
    ? [...rows].reverse().flatMap((r) => {
        const p = positions?.[r.number];
        const inPit = r.status === "PIT";
        if (
          ["KO", "OUT"].includes(r.status) ||
          (inPit && !outline!.pit) ||
          !p ||
          (p[0] === 0 && p[1] === 0)
        )
          return [];
        const [x, y] = project(p[0], p[1]);
        return [
          {
            r,
            x,
            y,
            inPit,
            focus: !inPit && (selected.size === 0 || selected.has(r.number)),
          },
        ];
      })
    : [];
  const shown = useRef(time);
  useEffect(() => void (shown.current = time), [time]);
  const drawn = useRef(project);
  useEffect(() => void (drawn.current = project), [project]);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry!.isIntersecting),
    );
    observer.observe(svg.current!);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      const k = Math.min(width / box[2], height / box[3]);
      layer.current!.style.transform = `translate(${(width - box[2] * k) / 2}px, ${(height - box[3] * k) / 2}px) scale(${k})`;
    });
    observer.observe(svg.current!);
    return () => observer.disconnect();
  }, [box]);
  const snap =
    speed > 1 ||
    !onScreen ||
    Math.abs(time - shown.current) > 2000 ||
    drawn.current !== project;
  useLayoutEffect(() => void (snap && svg.current?.getBoundingClientRect()));
  const translate = (x: number, y: number, [fx, fy]: Frame) =>
    `translate(${x + fx - box[0]}px, ${y + fy - box[1]}px)`;
  const place = (x: number, y: number, frame: Frame, opacity = 1) => ({
    frame,
    style: {
      width: frame[2],
      height: frame[3],
      transform: translate(x, y, frame),
      transition: snap ? "none" : "transform 1000ms linear",
      opacity,
    },
  });
  const ghost = (positions: Positions): Positions => {
    const p = pit && positions[pit.anchor];
    if (!outline || !pit?.back || !p || !(p[0] || p[1])) return positions;
    const n = outline.x.length;
    const i = (nearest(outline, ...p) - Math.round(pit.back * n) + n) % n;
    return { ...positions, pit: [outline.x[i]!, outline.y[i]!] };
  };
  const ring = positions && ghost(positions).pit;
  useCarMotion(layer, project, onScreen, {
    positions,
    positionTrail,
    time,
    speed,
    stream,
    ghost,
    translate,
  });
  return (
    <MapFrame banner={banner} note={note}>
      {(full) => (
        <>
          <div
            className={`relative ${full ? "min-h-0 w-full flex-1" : "aspect-square w-full"}`}
            onPointerMove={(event) => {
              const at = `${event.clientX},${event.clientY}`;
              if (at === pointer.current) return;
              pointer.current = at;
              const target = (event.target as Element).closest("[data-number]");
              const number = target?.getAttribute("data-number");
              const p = new DOMPoint(
                event.clientX,
                event.clientY,
              ).matrixTransform(svg.current!.getScreenCTM()!.inverse());
              setHover((h) =>
                !number
                  ? null
                  : target!.tagName !== "circle" || h?.number !== number
                    ? { number, x: p.x, y: p.y }
                    : h,
              );
            }}
            onPointerLeave={() => {
              pointer.current = "";
              setHover(null);
            }}
          >
            <svg
              ref={svg}
              viewBox={box.join(" ")}
              className="absolute inset-0 size-full"
            >
              <polyline
                points={lane}
                fill="none"
                className="stroke-zinc-700"
                strokeWidth={6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={path}
                fill="none"
                className="stroke-zinc-700"
                strokeWidth={18}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {marks && <SectorFlags marshal={marks.marshal} flags={flags} />}
              {marks && <Markers {...marks} />}
            </svg>
            <div
              ref={layer}
              className="pointer-events-none absolute top-0 left-0 origin-top-left"
              style={{ width: box[2], height: box[3] }}
            >
              <Fragment key={stream}>
                {cars.map(({ r, x, y, inPit, focus }) => (
                  <MapPin
                    key={r.number}
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
                    className="absolute top-0 left-0 cursor-pointer"
                    {...place(
                      x,
                      y,
                      CAR,
                      focus || hovered === r.number ? 1 : 0.35,
                    )}
                  >
                    {!inPit && (
                      <path
                        d="M0 0L-24 -24"
                        stroke={ink(r.color)}
                        strokeWidth={3}
                      />
                    )}
                    <circle
                      r={14}
                      fill={ink(r.color)}
                      className="stroke-surface"
                      strokeWidth={4}
                    />
                  </MapPin>
                ))}
                {project && pit && ring && (
                  <div
                    data-number="pit"
                    aria-hidden="true"
                    className="absolute top-0 left-0"
                    style={place(...project(...ring), RING).style}
                  >
                    <svg viewBox={RING.join(" ")} className="block size-full">
                      <circle
                        r={18}
                        fill="none"
                        className="stroke-surface"
                        strokeWidth={8}
                      />
                      <circle
                        r={18}
                        fill="none"
                        stroke={pit.color}
                        strokeWidth={4}
                      />
                    </svg>
                  </div>
                )}
                {cars.map(({ r, x, y, inPit, focus }) => {
                  if (inPit) return null;
                  const crown = r.position === 1 && (race || r.bestLap);
                  const laps =
                    !crown && race && r.lapsBehind ? `+${r.lapsBehind}` : "";
                  const extra = crown ? 34 : laps ? 12 * laps.length + 12 : 0;
                  return (
                    <MapPin
                      key={r.number}
                      data-number={r.number}
                      onClick={() => onToggle(r.number)}
                      className="absolute top-0 left-0 cursor-pointer"
                      {...place(
                        x,
                        y,
                        tag(extra),
                        focus || hovered === r.number ? 1 : 0.35,
                      )}
                    >
                      <rect
                        x={-94 - extra}
                        y={-56}
                        width={70 + extra}
                        height={32}
                        rx={3}
                        className="fill-zinc-800"
                        fillOpacity={0.9}
                      />
                      <path
                        d={`M-24 -24H${-94 - extra}`}
                        stroke={ink(r.color)}
                        strokeWidth={3}
                      />
                      <text
                        x={-59 - extra}
                        y={-40}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        className="fill-zinc-100 text-[22px] font-semibold"
                      >
                        {r.tla}
                      </text>
                      {crown ? (
                        <Crown
                          x={-58}
                          y={-51}
                          width={22}
                          height={22}
                          className="stroke-yellow-300"
                          strokeWidth={2.5}
                        />
                      ) : laps ? (
                        <text
                          x={-36}
                          y={-40}
                          dominantBaseline="middle"
                          textAnchor="end"
                          className="fill-zinc-300 text-[21px] font-bold"
                        >
                          {laps}
                        </text>
                      ) : null}
                    </MapPin>
                  );
                })}
              </Fragment>
            </div>
            {hover && card && (
              <svg
                viewBox={box.join(" ")}
                className="pointer-events-none absolute inset-0 size-full"
              >
                <circle
                  data-number={card.number}
                  cx={hover.x}
                  cy={hover.y}
                  r={6}
                  fill="transparent"
                  className="pointer-events-auto cursor-pointer"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onToggle(card.number)}
                />
                <MapCard
                  x={cardX!}
                  y={hover.y}
                  box={box}
                  row={card}
                  telemetry={telemetry?.[card.number]}
                />
              </svg>
            )}
          </div>
          {!outline && (
            <p className="absolute inset-x-0 bottom-3 text-center text-sm text-zinc-400">
              The track outline shows after a few laps.
            </p>
          )}
        </>
      )}
    </MapFrame>
  );
};
