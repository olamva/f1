import type { Message, Radio, Row } from "./view.ts";

const time = (utc: string) =>
  new Date(utc.endsWith("Z") ? utc : `${utc}Z`).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const FLAG: Record<string, string> = {
  GREEN: "bg-emerald-500",
  CLEAR: "bg-emerald-500",
  YELLOW: "bg-yellow-400",
  "DOUBLE YELLOW": "bg-yellow-400",
  RED: "bg-red-600",
  BLUE: "bg-sky-500",
  CHEQUERED: "bg-zinc-100",
  "BLACK AND WHITE": "bg-zinc-400",
};

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

export const Panel = ({ title, children }: PanelProps) => (
  <section className="rounded-xl bg-surface p-3">
    <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">{title}</h2>
    {children}
  </section>
);

interface RaceControlProps {
  messages: Message[];
}

export const RaceControl = ({ messages }: RaceControlProps) => (
  <Panel title="Race control">
    <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
      {messages.length === 0 && <li className="text-zinc-500">No messages yet.</li>}
      {messages.map((m, i) => (
        <li key={i} className="flex gap-2">
          <span className="tabular shrink-0 font-mono text-xs text-zinc-500">{time(m.utc)}</span>
          {m.flag && <span className={`mt-1 size-2.5 shrink-0 rounded-sm ${FLAG[m.flag] ?? "bg-zinc-500"}`} title={m.flag} />}
          <span>{m.text}</span>
        </li>
      ))}
    </ul>
  </Panel>
);

interface WeatherProps {
  weather: Record<string, string> | undefined;
}

const WEATHER: [key: string, label: string, unit: string][] = [
  ["AirTemp", "Air", "°C"],
  ["TrackTemp", "Track", "°C"],
  ["Humidity", "Humidity", "%"],
  ["WindSpeed", "Wind", "m/s"],
];

export const Weather = ({ weather }: WeatherProps) => (
  <Panel title="Weather">
    <dl className="grid grid-cols-5 gap-2 text-center">
      {WEATHER.map(([k, label, unit]) => (
        <div key={k}>
          <dt className="text-xs text-zinc-500">{label}</dt>
          <dd className="tabular text-lg font-semibold">
            {weather?.[k] ?? "—"}
            <span className="text-xs text-zinc-400">{weather?.[k] ? unit : ""}</span>
          </dd>
        </div>
      ))}
      <div>
        <dt className="text-xs text-zinc-500">Rain</dt>
        <dd className="text-lg font-semibold">{weather?.Rainfall === "1" ? "Yes" : "No"}</dd>
      </div>
    </dl>
  </Panel>
);

interface TeamRadioProps {
  radios: Radio[];
  rows: Row[];
}

export const TeamRadio = ({ radios, rows }: TeamRadioProps) => {
  const by = new Map(rows.map((r) => [r.number, r]));
  return (
    <Panel title="Team radio">
      <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
        {radios.length === 0 && <li className="text-zinc-500">No radio yet.</li>}
        {radios.slice(0, 30).map((r) => (
          <li key={r.url} className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-sm" style={{ background: by.get(r.number)?.color }} />
            <span className="w-10 font-semibold">{by.get(r.number)?.tla ?? r.number}</span>
            <span className="tabular font-mono text-xs text-zinc-500">{time(r.utc)}</span>
            <audio controls preload="none" src={r.url} className="h-8 flex-1" />
          </li>
        ))}
      </ul>
    </Panel>
  );
};
