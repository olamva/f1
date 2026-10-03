import { TeamLogo } from "../TeamLogo.tsx";
import { Panel } from "./Panels.tsx";
import type { Prediction } from "./prediction.ts";

interface ChampionshipProps {
  drivers: Prediction[];
}

export const Championship = ({ drivers }: ChampionshipProps) => (
  <Panel title="Live drivers' championship" className="flex flex-col">
    <div className="min-h-72 grow basis-0 overflow-y-auto">
      <table className="tabular w-full font-mono text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="px-2 py-1 text-right">P</th>
            <th className="px-2 py-1">Driver</th>
            <th
              className="px-2 py-1 text-right"
              title="Places gained or lost in the championship"
            >
              +/−
            </th>
            <th className="px-2 py-1 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.number} className="border-t border-zinc-800">
              <td className="px-2 py-1 text-right text-zinc-400">
                {d.position}
              </td>
              <td className="px-2 py-1">
                <span className="flex items-center gap-2">
                  <TeamLogo team={d.team} className="h-4 w-6" />
                  <span className="font-semibold" title={d.name}>
                    {d.tla}
                  </span>
                </span>
              </td>
              <td
                className={`px-2 py-1 text-right ${d.gained ? (d.gained > 0 ? "text-emerald-400" : "text-red-500") : "text-zinc-500"}`}
              >
                {d.gained
                  ? `${d.gained > 0 ? "▲" : "▼"}${Math.abs(d.gained)}`
                  : "–"}
              </td>
              <td className="px-2 py-1 text-right">{d.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Panel>
);
