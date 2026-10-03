const TYRE: Record<string, string> = {
  SOFT: "text-red-500 border-red-500",
  MEDIUM: "text-yellow-300 border-yellow-300",
  HARD: "text-zinc-100 border-zinc-100",
  INTERMEDIATE: "text-emerald-400 border-emerald-400",
  WET: "text-sky-400 border-sky-400",
};

export const tyreColor = (compound: string) =>
  TYRE[compound] ?? "border-zinc-500 text-zinc-400";

interface CompoundProps {
  compound: string;
  className?: string;
}

export const Compound = ({ compound, className = "" }: CompoundProps) => (
  <span
    className={`grid size-5 place-items-center rounded-full border-2 text-[10px] font-bold ${tyreColor(compound)} ${className}`}
  >
    {compound[0]}
  </span>
);
