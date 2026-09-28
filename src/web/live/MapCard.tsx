import { logoSrc } from "../TeamLogo.tsx";
import { numberSrc, slug } from "../stats/TeamNumber.tsx";
import type { Row } from "./view.ts";

interface MapCardProps {
  x: number;
  y: number;
  row: Row;
}

export const MapCard = ({ x, y, row }: MapCardProps) => {
  const src = numberSrc(slug(row.last));
  return (
    <g id="track-map-card" className="pointer-events-none">
      <clipPath id="card-clip">
        <rect x={x} y={y - 65} width={240} height={130} rx={8} />
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
        y={y - 65}
        width={240}
        height={130}
        rx={8}
        className="fill-zinc-800 drop-shadow-lg"
      />
      <rect
        x={x}
        y={y - 65}
        width={240}
        height={130}
        rx={8}
        fill="url(#card-tint)"
      />
      {logoSrc(row.team) && (
        <image
          href={logoSrc(row.team)}
          x={x + 110}
          y={y - 85}
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
          y={y - 53}
          width={120}
          height={40}
          preserveAspectRatio="xMinYMid meet"
          filter="url(#card-number-tint)"
        />
      ) : (
        <text
          x={x + 20}
          y={y - 20}
          fill={row.color}
          className="font-f1 text-[36px] font-black italic"
        >
          {row.number}
        </text>
      )}
      <text x={x + 20} y={y + 18} className="fill-zinc-400 text-[18px]">
        {row.name.slice(0, -row.last.length).trim()}
      </text>
      <text
        x={x + 20}
        y={y + 50}
        className="font-f1 fill-zinc-100 text-[26px] font-black uppercase"
      >
        {row.last}
      </text>
    </g>
  );
};
