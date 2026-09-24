import { useMemo, useState } from "react";

export type Series = {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: [x: number, y: number][];
};

interface LineChartProps {
  series: Series[];
  xLabel: string;
  yFormat?: (y: number) => string;
  invert?: boolean;
  yDomain?: [number, number];
  height?: number;
}

const W = 800;
const M = { top: 16, right: 56, bottom: 32, left: 52 };

const ticks = (lo: number, hi: number, n = 5): number[] => {
  const raw = (hi - lo) / n || 1;
  const step = [1, 2, 5, 10].map((m) => m * 10 ** Math.floor(Math.log10(raw))).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
};

const extent = (vals: number[]): [number, number] =>
  vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1];

interface LegendProps {
  series: Series[];
}

export const Legend = ({ series }: LegendProps) => (
  <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
    {series.map((s) => (
      <li key={s.id} className="flex items-center gap-1.5">
        <svg width="18" height="6">
          <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
        </svg>
        {s.label}
      </li>
    ))}
  </ul>
);

export const LineChart = ({ series, xLabel, yFormat = String, invert, yDomain, height = 320 }: LineChartProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.points);
  const [x0, x1] = extent(all.map((p) => p[0]));
  const [y0, y1] = yDomain ?? extent(all.map((p) => p[1]));
  const sx = (x: number) => M.left + ((x - x0) / (x1 - x0 || 1)) * (W - M.left - M.right);
  const sy = (y: number) => {
    const f = (y - y0) / (y1 - y0 || 1);
    return M.top + (invert ? f : 1 - f) * (height - M.top - M.bottom);
  };
  const xs = useMemo(() => [...new Set(all.map((p) => p[0]))].sort((a, b) => a - b), [all]);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const near = xs.reduce((b, v) => (Math.abs(sx(v) - x) < Math.abs(sx(b) - x) ? v : b), xs[0] ?? 0);
    setHover(xs.length ? near : null);
  };
  const at = hover === null ? [] : series.map((s) => ({ s, p: s.points.find((p) => p[0] === hover) })).filter((v) => v.p);
  return (
    <div className="relative">
      {series.length > 1 && <Legend series={series} />}
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks(Math.min(y0, y1), Math.max(y0, y1)).map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={sy(v)} y2={sy(v)} stroke="#27272a" />
            <text x={M.left - 8} y={sy(v) + 4} textAnchor="end" className="fill-zinc-500 text-[11px]">{yFormat(v)}</text>
          </g>
        ))}
        {ticks(x0, x1, 8).map((v) => (
          <text key={v} x={sx(v)} y={height - 12} textAnchor="middle" className="fill-zinc-500 text-[11px]">{v}</text>
        ))}
        <text x={W - M.right} y={height - 12} textAnchor="end" className="fill-zinc-500 text-[11px]" dx={40}>{xLabel}</text>
        {series.map((s) => (
          <polyline
            key={s.id}
            points={s.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? "6 4" : undefined}
          />
        ))}
        {series.length <= 6 &&
          series.map((s) => {
            const last = s.points.at(-1);
            return last ? (
              <text key={s.id} x={sx(last[0]) + 8} y={sy(last[1]) + 4} className="fill-zinc-300 text-[11px]">{s.label}</text>
            ) : null;
          })}
        {hover !== null && (
          <g>
            <line x1={sx(hover)} x2={sx(hover)} y1={M.top} y2={height - M.bottom} stroke="#52525b" />
            {at.map(({ s, p }) => (
              <circle key={s.id} cx={sx(p![0])} cy={sy(p![1])} r={4} fill={s.color} stroke="#18181b" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && at.length > 0 && (
        <div className="pointer-events-none absolute top-8 right-2 rounded-lg bg-zinc-800/95 px-3 py-2 text-xs shadow-lg">
          <div className="mb-1 text-zinc-400">{xLabel} {hover}</div>
          {[...at]
            .sort((a, b) => (invert ? a.p![1] - b.p![1] : b.p![1] - a.p![1]))
            .slice(0, 12)
            .map(({ s, p }) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="w-24 text-zinc-300">{s.label}</span>
                <span className="tabular ml-auto font-mono text-zinc-100">{yFormat(p![1])}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
