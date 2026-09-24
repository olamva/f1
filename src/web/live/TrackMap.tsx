import { useMemo } from "react";
import type { Outline } from "../../shared/timing.ts";
import type { Row } from "./view.ts";

const SIZE = 1000;
const PAD = 60;

interface TrackMapProps {
  outline: Outline | null;
  positions: Record<string, [number, number]> | undefined;
  rows: Row[];
  selected: Set<string>;
  note: string | null;
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

export const TrackMap = ({ outline, positions, rows, selected, note }: TrackMapProps) => {
  const project = useMemo(() => (outline ? projector(outline) : null), [outline]);
  const path = useMemo(
    () =>
      outline && project
        ? outline.x.map((x, i) => project(x, outline.y[i]!).map(Math.round).join(",")).join(" ")
        : "",
    [outline, project],
  );
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
                style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 1000ms linear" }}
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
