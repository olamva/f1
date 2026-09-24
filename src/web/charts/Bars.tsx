import { useState } from "react";
import { summary } from "./summary.ts";

export type Box = { id: string; label: string; color: string; values: number[] };

interface BoxPlotProps {
  boxes: Box[];
  format: (v: number) => string;
}

export const BoxPlot = ({ boxes, format }: BoxPlotProps) => {
  const [hover, setHover] = useState<string | null>(null);
  const stats = boxes.map((b) => ({ ...b, ...summary(b.values) }));
  const lo = Math.min(...stats.map((s) => s.min));
  const hi = Math.max(...stats.map((s) => s.max));
  const row = 26;
  const W = 800;
  const L = 60;
  const R = 90;
  const sx = (v: number) => L + ((v - lo) / (hi - lo || 1)) * (W - L - R);
  return (
    <svg viewBox={`0 0 ${W} ${stats.length * row + 10}`} className="w-full">
      {stats.map((s, i) => {
        const y = i * row + 14;
        return (
          <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
            <rect x={0} y={y - row / 2} width={W} height={row} fill={hover === s.id ? "#27272a" : "transparent"} />
            <text x={L - 8} y={y + 4} textAnchor="end" className="fill-zinc-300 text-[12px]">{s.label}</text>
            <line x1={sx(s.min)} x2={sx(s.max)} y1={y} y2={y} stroke="#71717a" />
            <rect x={sx(s.q1)} y={y - 7} width={Math.max(2, sx(s.q3) - sx(s.q1))} height={14} rx={4} fill={s.color} opacity={0.85} />
            <line x1={sx(s.median)} x2={sx(s.median)} y1={y - 9} y2={y + 9} stroke="#fafafa" strokeWidth={2} />
            <text x={W - R + 8} y={y + 4} className="tabular fill-zinc-400 text-[11px]">
              {hover === s.id ? `${format(s.q1)}–${format(s.q3)}` : format(s.median)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export type Bar = { id: string; label: string; color: string; value: number };

interface DivergingBarsProps {
  bars: Bar[];
  format: (v: number) => string;
}

export const DivergingBars = ({ bars, format }: DivergingBarsProps) => {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  const W = 800;
  const L = 60;
  const mid = L + (W - L) / 2;
  const half = (W - L) / 2 - 50;
  const row = 24;
  return (
    <svg viewBox={`0 0 ${W} ${bars.length * row + 4}`} className="w-full">
      <line x1={mid} x2={mid} y1={0} y2={bars.length * row} stroke="#3f3f46" />
      {bars.map((b, i) => {
        const y = i * row + 12;
        const w = (Math.abs(b.value) / max) * half;
        const x = b.value >= 0 ? mid : mid - w;
        return (
          <g key={b.id}>
            <title>{`${b.label}: ${format(b.value)}`}</title>
            <text x={L - 8} y={y + 4} textAnchor="end" className="fill-zinc-300 text-[12px]">{b.label}</text>
            <rect x={x} y={y - 8} width={Math.max(w, 1)} height={16} rx={4} fill={b.color} />
            <text
              x={b.value >= 0 ? mid + w + 6 : mid - w - 6}
              y={y + 4}
              textAnchor={b.value >= 0 ? "start" : "end"}
              className="tabular fill-zinc-400 text-[11px]"
            >
              {format(b.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
