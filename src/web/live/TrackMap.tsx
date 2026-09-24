import { useLayoutEffect, useMemo, useRef } from "react";
import type { Outline } from "../../shared/timing.ts";
import type { PositionTrail } from "./useFeed.ts";
import type { Row } from "./view.ts";

const SIZE = 1000;
const PAD = 60;

interface TrackMapProps {
  outline: Outline | null;
  positions: Record<string, [number, number]> | undefined;
  rows: Row[];
  selected: Set<string>;
  onToggle: (number: string) => void;
  note: string | null;
  positionTrail?: PositionTrail;
  speed?: number;
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
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = (SIZE - 2 * PAD) / Math.max(maxX - minX, maxY - minY);
  const offX = (SIZE - (maxX - minX) * scale) / 2;
  const offY = (SIZE - (maxY - minY) * scale) / 2;
  return (x: number, y: number): [number, number] => {
    const [u, v] = turn(x, y);
    return [offX + (u - minX) * scale, SIZE - (offY + (v - minY) * scale)];
  };
};

export const TrackMap = ({ outline, positions, rows, selected, onToggle, note, positionTrail, speed = 1 }: TrackMapProps) => {
  const cars = useRef(new Map<string, SVGGElement>());
  const project = useMemo(() => (outline ? projector(outline) : null), [outline]);
  const path = useMemo(
    () =>
      outline && project
        ? outline.x.map((x, i) => project(x, outline.y[i]!).map(Math.round).join(",")).join(" ")
        : "",
    [outline, project],
  );
  useLayoutEffect(() => {
    if (!project || !positionTrail || speed <= 1) return;
    for (const [number, car] of cars.current) {
      const points = [positionTrail.from[number], ...positionTrail.samples.map((sample) => sample[number])]
        .filter((p): p is [number, number] => !!p && (p[0] !== 0 || p[1] !== 0))
        .map(([x, y]) => project(x, y));
      if (points.length < 2) continue;
      car.getAnimations().forEach((animation) => animation.cancel());
      car.animate(points.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), {
        duration: 250,
        easing: "linear",
      });
    }
  }, [positionTrail, project, speed]);
  return (
    <div className="relative rounded-xl bg-surface p-2">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="aspect-square w-full">
        <polyline points={path} fill="none" stroke="#3f3f46" strokeWidth={18} strokeLinejoin="round" strokeLinecap="round" />
        {outline?.corners.map((c) => {
          const [x, y] = project!(c.x, c.y);
          return (
            <text key={c.number} x={x} y={y} className="fill-zinc-500 text-[18px]" textAnchor="middle">
              {c.number}
            </text>
          );
        })}
        {project &&
          [...rows].reverse().map((r) => {
            const p = positions?.[r.number];
            if (r.status === "PIT" || !p || (p[0] === 0 && p[1] === 0)) return null;
            const [x, y] = project(p[0], p[1]);
            const focus = selected.size === 0 || selected.has(r.number);
            return (
              <g
                key={r.number}
                ref={(node) => {
                  if (node) cars.current.set(r.number, node);
                  else cars.current.delete(r.number);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${r.name}`}
                aria-pressed={selected.has(r.number)}
                onClick={() => onToggle(r.number)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggle(r.number);
                  }
                }}
                className="cursor-pointer"
                style={{ transform: `translate(${x}px, ${y}px)`, transition: speed > 1 ? "none" : "transform 1000ms linear" }}
                opacity={focus ? 1 : 0.35}
              >
                <circle r={14} fill={r.color} stroke="#18181b" strokeWidth={4} />
                <text y={-22} textAnchor="middle" className="fill-zinc-100 text-[22px] font-semibold">
                  {r.tla}
                </text>
              </g>
            );
          })}
      </svg>
      {(note || !outline) && (
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-zinc-400">
          {note ?? "The track outline shows after a few laps."}
        </p>
      )}
    </div>
  );
};
