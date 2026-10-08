import { useState, type PointerEvent } from "react";
import type { LapPositions, RaceArchive } from "../shared/season.ts";
import { teamColor } from "../shared/teams.ts";
import { FAVOURITE_ROW } from "./favourite.ts";
import { TeamLogo } from "./TeamLogo.tsx";

interface PositionsProps {
  rows: RaceArchive["races"][number]["results"];
  laps: LapPositions;
  favourite?: string;
}

export const Positions = ({ rows, laps, favourite }: PositionsProps) => {
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const focus = hover ?? pinned;
  const last = Math.max(
    1,
    ...Object.values(laps).map((line) => line.length - 1),
  );
  const ticks = Array.from(
    { length: Math.floor(last / 10) + 1 },
    (_, i) => i * 10,
  );
  const highlight = (id: string) => ({
    onPointerEnter: (event: PointerEvent) =>
      event.pointerType === "mouse" && setHover(id),
    onPointerLeave: () => setHover(null),
    onClick: () => setPinned((current) => (current === id ? null : id)),
  });
  return (
    <div className="tabular text-xs">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] pb-1 text-[10px] text-zinc-500">
        <div className="relative mx-2 h-4">
          {ticks.map((lap) => (
            <span
              key={lap}
              className="absolute -translate-x-1/2"
              style={{ left: `${(lap / last) * 100}%` }}
            >
              {lap}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem]">
        <div className="relative mx-2">
          <svg
            viewBox={`0 0 ${last} ${rows.length}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {ticks.map((lap) => (
              <line
                key={lap}
                x1={lap}
                x2={lap}
                y2={rows.length}
                stroke="#27272a"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {[...rows]
              .sort(
                (a, b) =>
                  Number(a.number === focus) - Number(b.number === focus),
              )
              .map((row) => {
                const points = (laps[row.number] ?? [])
                  .map((position, lap) => `${lap},${position - 0.5}`)
                  .join(" ");
                return (
                  <g
                    key={row.number}
                    className="cursor-pointer"
                    {...highlight(row.number)}
                  >
                    <polyline
                      points={points}
                      fill="none"
                      stroke={teamColor(row.team)}
                      strokeWidth={focus === row.number ? 3 : 2}
                      strokeOpacity={focus && focus !== row.number ? 0.15 : 1}
                      strokeDasharray={
                        rows.findIndex((r) => r.team === row.team) !==
                        rows.indexOf(row)
                          ? "4 3"
                          : undefined
                      }
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      pointerEvents="stroke"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
          </svg>
        </div>
        <ol>
          {rows.map((row) => (
            <li key={row.number}>
              <button
                type="button"
                aria-pressed={pinned === row.number}
                className={`flex h-6 w-full cursor-pointer items-center rounded pl-1 ${row.driver === favourite ? FAVOURITE_ROW : ""} ${focus && focus !== row.number ? "opacity-40" : ""} ${focus === row.number ? "font-bold text-white" : ""}`}
                {...highlight(row.number)}
              >
                <span className="w-6 text-left text-zinc-500">
                  {row.positionText}
                </span>
                <TeamLogo team={row.team} className="mr-1.5 h-4 w-6" />
                {row.code}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
