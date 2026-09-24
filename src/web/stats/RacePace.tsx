import { useState } from "react";
import type { Pace, Season } from "../../shared/season.ts";
import { useJson } from "../api.ts";
import { BoxPlot } from "../charts/Bars.tsx";
import { lapTime, summary } from "../charts/summary.ts";
import { Panel } from "../live/Panels.tsx";
import { Loading } from "../Loading.tsx";
import type { Who } from "./derive.ts";

interface RacePaceProps {
  season: Season;
  who: Map<string, Who>;
}

const SLOW = 1.07;

export const RacePace = ({ season, who }: RacePaceProps) => {
  const rounds = season.races.map((r) => r.round);
  const [round, setRound] = useState(rounds.at(-1) ?? 1);
  const pace = useJson<Pace>(`/api/pace/${round}`);
  const name = (r: number) => season.rounds.find((x) => x.round === r)?.name ?? `Round ${r}`;
  const medians = Object.values(pace.data ?? {}).filter((v) => v.length > 5).map((v) => summary(v).median);
  const cut = Math.min(...medians) * SLOW;
  const boxes = Object.entries(pace.data ?? {})
    .map(([id, laps]) => ({ id, label: who.get(id)?.code ?? id, color: who.get(id)?.color ?? "#888", values: laps.filter((l) => l <= cut) }))
    .filter((b) => b.values.length > 5)
    .sort((a, b) => summary(a.values).median - summary(b.values).median);
  return (
    <Panel title="Race pace: green-flag lap times">
      <select value={round} onChange={(e) => setRound(Number(e.target.value))} className="mb-3 rounded-md bg-zinc-800 px-2 py-1 text-sm">
        {rounds.map((r) => (
          <option key={r} value={r}>{name(r)}</option>
        ))}
      </select>
      <p className="mb-2 text-xs text-zinc-500">
        Lap 1, in-laps, out-laps and laps slower than 107% of the best median are left out. The box shows the middle half of the laps, and the line is the median.
      </p>
      {pace.data ? <BoxPlot boxes={boxes} format={lapTime} /> : <Loading label="Loading lap times…" error={pace.error} />}
    </Panel>
  );
};
