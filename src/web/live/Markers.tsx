import type { markers } from "./outline.ts";

export const Markers = ({
  finish,
  splits,
  detection,
  labels,
  corners,
}: ReturnType<typeof markers>) => (
  <>
    {detection && (
      <line
        x1={detection[0] - detection[2]}
        y1={detection[1] - detection[3]}
        x2={detection[0] + detection[2]}
        y2={detection[1] + detection[3]}
        className="stroke-zinc-400"
        strokeWidth={4}
        strokeDasharray="4 4"
      />
    )}
    {splits.map(([x, y, dx, dy], i) => (
      <line
        key={i}
        x1={x - dx}
        y1={y - dy}
        x2={x + dx}
        y2={y + dy}
        className="stroke-zinc-400"
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
      className="stroke-zinc-100"
      strokeWidth={6}
    />
  </>
);
