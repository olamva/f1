import type { CSSProperties } from "react";
import { Trophy } from "lucide-react";

export interface PodiumEntry {
  id: string;
  name: string;
  color: string;
  value: string;
  detail?: string;
}

interface PodiumProps {
  entries: PodiumEntry[];
  onSelect?: (id: string) => void;
}

const METALS = ["#facc15", "#d4d4d8", "#d97706"];
const HEIGHTS = ["h-28", "h-20", "h-16"];
const ORDER = ["order-2", "order-1", "order-3"];
const DELAYS = [400, 200, 0];

export const Podium = ({ entries, onSelect }: PodiumProps) => (
  <div className="mx-auto mb-4 max-w-2xl pt-2">
    <div className="grid grid-cols-3 items-end gap-2 text-center">
      {entries.slice(0, 3).map((e, i) => {
        const Name = onSelect ? "button" : "div";
        return (
          <div
            key={e.id}
            className={`podium-step min-w-0 ${ORDER[i]}`}
            style={
              {
                "--metal": METALS[i],
                "--team": e.color,
                "--delay": `${DELAYS[i]}ms`,
              } as CSSProperties
            }
          >
            <div className="podium-name mb-2 flex min-h-12 flex-col items-center justify-end">
              {i === 0 && (
                <Trophy
                  aria-hidden
                  className="mb-1 size-5 text-yellow-400 drop-shadow-[0_0_6px_rgb(250_204_21_/_0.6)]"
                />
              )}
              <Name
                {...(onSelect && {
                  type: "button" as const,
                  onClick: () => onSelect(e.id),
                })}
                className={`max-w-full text-xs font-semibold wrap-break-word sm:text-sm ${onSelect ? "cursor-pointer hover:text-red-400" : ""}`}
              >
                {e.name}
              </Name>
              {e.detail && (
                <span className="max-w-full truncate text-[11px] text-zinc-500">
                  {e.detail}
                </span>
              )}
            </div>
            <div
              className={`podium-block relative flex flex-col items-center justify-center rounded-t-lg ${HEIGHTS[i]}`}
            >
              <span className="podium-metal text-3xl leading-none font-black">
                {i + 1}
              </span>
              <span className="tabular mt-1 text-xs text-zinc-300">
                {e.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
    <div className="h-px bg-linear-to-r from-transparent via-zinc-600 to-transparent" />
  </div>
);
