import type { Telemetry } from "../../shared/timing.ts";
import { logoSrc } from "../TeamLogo.tsx";
import { numberSrc, slug } from "../stats/TeamNumber.tsx";
import type { Row } from "./view.ts";

interface MapCardProps {
  x: number;
  y: number;
  box: readonly [number, number, number, number];
  row: Row;
  telemetry?: Telemetry;
}

interface PedalProps {
  x: number;
  y: number;
  label: string;
  value: number;
  className: string;
}

const Pedal = ({ x, y, label, value, className }: PedalProps) => (
  <>
    <text x={x} y={y + 8} className="fill-zinc-400 text-[12px] font-semibold">
      {label}
    </text>
    <rect x={x + 30} y={y} width={66} height={8} rx={2} fill="#3f3f46" />
    <rect
      x={x + 30}
      y={y}
      width={(66 * Math.min(value, 100)) / 100}
      height={8}
      rx={2}
      className={className}
    />
  </>
);

export const MapCard = ({ x, y, box, row, telemetry }: MapCardProps) => {
  const src = numberSrc(slug(row.last));
  const height = telemetry ? 200 : 130;
  const top = Math.min(
    Math.max(y - height / 2, box[1]),
    box[1] + box[3] - height,
  );
  return (
    <g id="track-map-card" className="pointer-events-none">
      <clipPath id="card-clip">
        <rect x={x} y={top} width={240} height={height} rx={8} />
      </clipPath>
      <linearGradient id="card-tint" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={row.color} stopOpacity={0.25} />
        <stop offset="1" stopColor={row.color} stopOpacity={0} />
      </linearGradient>
      <filter id="card-number-tint">
        <feFlood floodColor={row.color} />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
      <rect
        x={x}
        y={top}
        width={240}
        height={height}
        rx={8}
        className="fill-zinc-800 drop-shadow-lg"
      />
      <rect
        x={x}
        y={top}
        width={240}
        height={height}
        rx={8}
        fill="url(#card-tint)"
      />
      {logoSrc(row.team) && (
        <image
          href={logoSrc(row.team)}
          x={x + 110}
          y={top + height / 2 - 85}
          width={170}
          height={170}
          opacity={0.15}
          clipPath="url(#card-clip)"
        />
      )}
      {src ? (
        <image
          href={src}
          x={x + 20}
          y={top + 12}
          width={120}
          height={40}
          preserveAspectRatio="xMinYMid meet"
          filter="url(#card-number-tint)"
        />
      ) : (
        <text
          x={x + 20}
          y={top + 45}
          fill={row.color}
          className="font-f1 text-[36px] font-black italic"
        >
          {row.number}
        </text>
      )}
      <text x={x + 20} y={top + 83} className="fill-zinc-400 text-[18px]">
        {row.name.slice(0, -row.last.length).trim()}
      </text>
      <text
        x={x + 20}
        y={top + 115}
        className="font-f1 fill-zinc-100 text-[26px] font-black uppercase"
      >
        {row.last}
      </text>
      {telemetry && (
        <>
          <line
            x1={x + 20}
            y1={top + 132}
            x2={x + 220}
            y2={top + 132}
            stroke="#3f3f46"
          />
          <text
            x={x + 20}
            y={top + 163}
            className="font-f1 tabular fill-zinc-100 text-[24px] font-black"
          >
            {telemetry[0]}
            <tspan dx={6} className="fill-zinc-400 text-[12px] font-semibold">
              KM/H
            </tspan>
          </text>
          <text
            x={x + 220}
            y={top + 163}
            textAnchor="end"
            className="font-f1 tabular fill-zinc-100 text-[24px] font-black"
          >
            <tspan dx={-6} className="fill-zinc-400 text-[12px] font-semibold">
              GEAR
            </tspan>
            <tspan dx={6}>{telemetry[1] || "N"}</tspan>
          </text>
          <Pedal
            x={x + 20}
            y={top + 176}
            label="THR"
            value={telemetry[2]}
            className="fill-emerald-400"
          />
          <Pedal
            x={x + 124}
            y={top + 176}
            label="BRK"
            value={telemetry[3]}
            className="fill-red-500"
          />
        </>
      )}
    </g>
  );
};
