import type { SessionBest, SessionBests } from "./view.ts";

const BestValue = ({
  best,
  align,
}: {
  best: SessionBest | null;
  align: string;
}) =>
  best ? (
    <span className={`flex flex-col leading-4 font-semibold ${align}`}>
      <span style={{ color: best.color }}>{best.tla}</span>
      <span className="text-purple">{best.value}</span>
    </span>
  ) : (
    <span className="text-zinc-600">—</span>
  );

interface BestRowProps {
  bests: SessionBests;
  widths: number[];
  qualifying: boolean;
}

export const BestRow = ({ bests, widths, qualifying }: BestRowProps) => (
  <tr className="hidden border-t border-zinc-800 text-xs sm:table-row">
    <td />
    <td className="font-f1 px-2 py-1 tracking-wider text-zinc-500 uppercase">
      Best
    </td>
    <td colSpan={2} />
    <td className="px-2 py-1">
      <BestValue best={bests.lap} align="items-end" />
    </td>
    <td className="px-2 py-1">
      <span className="flex gap-1.5">
        {bests.sectors.map((best, i) => (
          <span
            key={i}
            className={`relative flex flex-col text-[10px] ${qualifying ? "min-w-17" : ""}`}
          >
            <span className="invisible flex gap-px">
              {Array.from({ length: widths[i] ?? 0 }, (_, j) => (
                <span key={j} className="h-1 min-w-1.5 flex-1" />
              ))}
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              <BestValue best={best} align="items-center" />
            </span>
          </span>
        ))}
      </span>
    </td>
    <td colSpan={4} />
  </tr>
);
