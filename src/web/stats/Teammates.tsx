import type { Duel, Who } from "./derive.ts";

interface TeammatesProps {
  duels: Duel[];
  who: Map<string, Who>;
  hasSprints: boolean;
  hasSprintQualifying: boolean;
}

interface SplitProps {
  label: string;
  pair: [number, number];
  color: string;
}

const Split = ({ label, pair, color }: SplitProps) => {
  const total = pair[0] + pair[1] || 1;
  return (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-sm">
      <span className="tabular text-right font-semibold">{pair[0]}</span>
      <div className="flex h-3 gap-0.5" title={label}>
        <div
          className="rounded-l"
          style={{ width: `${(pair[0] / total) * 100}%`, background: color }}
        />
        <div
          className="rounded-r bg-zinc-600"
          style={{ width: `${(pair[1] / total) * 100}%` }}
        />
      </div>
      <span className="tabular font-semibold">{pair[1]}</span>
    </div>
  );
};

export const Teammates = ({
  duels,
  who,
  hasSprints,
  hasSprintQualifying,
}: TeammatesProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {duels.map((d) => {
      const [a, b] = [who.get(d.a), who.get(d.b)];
      const color = a?.color ?? "#888";
      const faster = d.gap === null ? null : d.gap < 0 ? a : b;
      return (
        <section key={d.team} className="space-y-2 rounded-xl bg-surface p-3">
          <header className="flex items-center justify-between text-sm font-semibold">
            <span>{a?.name ?? d.a}</span>
            <span className="text-zinc-500">vs</span>
            <span>{b?.name ?? d.b}</span>
          </header>
          <div className="text-xs text-zinc-500">Qualifying</div>
          <Split label="Qualifying" pair={d.quali} color={color} />
          <div className="text-xs text-zinc-500">Race (both classified)</div>
          <Split label="Race" pair={d.race} color={color} />
          <div className="text-xs text-zinc-500">Race points</div>
          <Split label="Race points" pair={d.racePoints} color={color} />
          {hasSprints && (
            <>
              <div className="border-t border-zinc-700 pt-2 text-xs font-semibold text-zinc-400">
                Sprint
              </div>
              {hasSprintQualifying && (
                <>
                  <div className="text-xs text-zinc-500">
                    Sprint qualifying head to head
                  </div>
                  <Split
                    label="Sprint qualifying"
                    pair={d.sprintQuali}
                    color={color}
                  />
                </>
              )}
              <div className="text-xs text-zinc-500">
                Head to head (both classified)
              </div>
              <Split label="Sprint" pair={d.sprint} color={color} />
              <div className="text-xs text-zinc-500">Sprint points</div>
              <Split
                label="Sprint points"
                pair={d.sprintPoints}
                color={color}
              />
            </>
          )}
          {faster && d.gap !== null && (
            <p className="text-xs text-zinc-400">
              Median qualifying gap: {faster.code} faster by{" "}
              {Math.abs(d.gap).toFixed(3)} s
            </p>
          )}
        </section>
      );
    })}
  </div>
);
