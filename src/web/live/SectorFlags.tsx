import { Flag } from "lucide-react";

interface SectorFlagsProps {
  marshal: { number: number; path: string; at: [number, number] }[];
  flags: Map<number, string>;
}

export const SectorFlags = ({ marshal, flags }: SectorFlagsProps) => {
  const flagged = marshal.filter((m) => flags.has(m.number));
  return (
    <>
      {flagged.map(({ number, path }) => (
        <polyline
          key={number}
          points={path}
          fill="none"
          stroke="#facc15"
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {flagged.map(({ number, at: [x, y] }) => {
        const double = flags.get(number) === "DOUBLE YELLOW";
        return (
          <g
            key={number}
            role="img"
            aria-label={`${double ? "Double yellow" : "Yellow"} flag in marshal sector ${number}`}
            transform={`translate(${x} ${y})`}
          >
            <rect
              x={double ? -23 : -15}
              y={-15}
              width={double ? 46 : 30}
              height={30}
              rx={7}
              fill="#facc15"
              stroke="#18181b"
              strokeWidth={3}
            />
            {(double ? [-17, 1] : [-8]).map((dx) => (
              <Flag
                key={dx}
                x={dx}
                y={-8}
                width={16}
                height={16}
                className="stroke-zinc-900"
                strokeWidth={2.5}
              />
            ))}
          </g>
        );
      })}
    </>
  );
};
