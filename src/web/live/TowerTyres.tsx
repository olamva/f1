import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Compound, tyreColor } from "../Tyre.tsx";
import type { Row } from "./view.ts";

interface TyreProps {
  compound: string;
  age: number | null;
}

export const Tyre = ({ compound, age }: TyreProps) =>
  compound ? (
    <span className="flex items-center gap-1">
      <Compound compound={compound} />
      <span className="text-zinc-400">{age ?? ""}</span>
    </span>
  ) : null;

interface StintsProps {
  stints: Row["stints"];
  scale: number;
}

export const Cover = ({ children }: { children: ReactNode }) => (
  <span
    className="visible absolute inset-y-0 flex items-center gap-1.5 px-1 sm:px-2"
    style={{ left: "var(--tyres-left)", width: "var(--tyres-width)" }}
  >
    {children}
  </span>
);

export const Stints = ({ stints, scale }: StintsProps) => {
  const set = stints.at(-1);
  return (
    <Cover>
      <span className="flex h-2.5 flex-1 gap-px">
        {stints.map((stint, i) => (
          <span
            key={i}
            title={`${stint.compound.charAt(0)}${stint.compound.slice(1).toLowerCase()}, ${stint.laps} laps`}
            className={`min-w-1 rounded-xs bg-current ${tyreColor(stint.compound)}`}
            style={{ flex: stint.laps }}
          />
        ))}
        <span
          style={{
            flex:
              scale - stints.reduce((total, stint) => total + stint.laps, 0),
          }}
        />
      </span>
      {set && (
        <span
          title={set.new ? "New set" : "Used set"}
          className="text-[10px] text-zinc-400 sm:w-[4ch]"
        >
          {set.new ? "N" : "U"}
          <span className="max-sm:hidden">{set.new ? "ew" : "sed"}</span>
        </span>
      )}
    </Cover>
  );
};

export const useCover = () => {
  const table = useRef<HTMLTableElement>(null);
  useLayoutEffect(() => {
    const node = table.current!;
    const measure = () => {
      const cells = [
        ...node.querySelectorAll<HTMLElement>("th[data-tyres]"),
      ].filter((cell) => cell.offsetWidth);
      const left = cells[0]?.offsetLeft ?? 0;
      const last = cells.at(-1);
      node.style.setProperty("--tyres-left", `${left}px`);
      node.style.setProperty(
        "--tyres-width",
        `${last ? last.offsetLeft + last.offsetWidth - left : 0}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  });
  return table;
};

interface TyreCellsProps {
  row: Row;
  race: boolean;
  tyres: boolean;
  scale: number;
}

export const TyreCells = ({ row, race, tyres, scale }: TyreCellsProps) => {
  const set = row.stints.at(-1);
  const cover = race && tyres ? "invisible" : "";
  return (
    <>
      <td
        className={`px-1 py-1 sm:table-cell sm:px-2 ${race ? "" : "hidden"} ${cover}`}
      >
        {cover && <Stints stints={row.stints} scale={scale} />}
        <Tyre compound={set?.compound ?? ""} age={set?.age ?? null} />
      </td>
      <td
        className={`hidden px-1 py-1 text-right text-zinc-400 sm:table-cell sm:px-2 ${cover}`}
      >
        {row.pits || ""}
      </td>
      <td
        className={`box-content hidden min-w-[5ch] px-1 py-1 text-right text-zinc-400 sm:table-cell sm:px-2 ${cover}`}
      >
        {row.pitTime && `${row.pitTime}s`}
      </td>
    </>
  );
};
