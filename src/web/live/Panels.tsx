import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Message, Radio, Row } from "./view.ts";

const time = (utc: string) =>
  new Date(utc.endsWith("Z") ? utc : `${utc}Z`).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const FLAG: Record<string, string> = {
  GREEN: "bg-emerald-600 text-white",
  CLEAR: "bg-emerald-600 text-white",
  YELLOW: "bg-yellow-400 text-black",
  "DOUBLE YELLOW": "bg-yellow-400 text-black",
  RED: "bg-red-600 text-white",
  BLUE: "bg-sky-500 text-black",
  WHITE: "bg-white text-black",
  BLACK: "bg-black text-white ring-1 ring-zinc-500",
  "BLACK AND WHITE": "bg-zinc-400 text-black",
  "BLACK AND ORANGE": "bg-orange-500 text-black",
  CHEQUERED: "bg-zinc-100 text-black",
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
    <ul className="max-h-72 space-y-2 overflow-y-auto text-sm" aria-live="polite">
      {messages.length === 0 && <li className="text-zinc-500">No messages yet.</li>}
      {messages.map((m, i) => (
        <li key={i} className="flex gap-2">
          <span className="tabular shrink-0 font-mono text-xs text-zinc-500">{time(m.utc)}</span>
          {m.flag && <span className={`shrink-0 self-start rounded px-1.5 py-0.5 text-xs font-semibold ${FLAG[m.flag.toUpperCase()] ?? "bg-zinc-600 text-white"}`}>{m.flag}</span>}
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

const clip = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const Levels = ({ on, color }: { on: boolean; color: string }) => (
  <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
    {[0.1, 0.5, 0.3, 0.7, 0.2].map((d) => (
      <span
        key={d}
        className={`h-full w-1 origin-bottom rounded-sm ${on ? "animate-[level_0.8s_ease-in-out_infinite] motion-reduce:animate-none" : "scale-y-25"}`}
        style={{ background: color, animationDelay: `-${d}s` }}
      />
    ))}
  </span>
);

export const TeamRadio = ({ radios, rows }: TeamRadioProps) => {
  const by = new Map(rows.map((r) => [r.number, r]));
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState({ t: 0, d: 0 });
  const current = radios.find((r) => r.url === url) ?? radios[0];
  const driver = current && by.get(current.number);
  const color = driver?.color ?? "#71717a";
  const toggle = (r: Radio) => {
    const a = audio.current!;
    if (a.src !== r.url) {
      setUrl(r.url);
      setAt({ t: 0, d: 0 });
      a.src = r.url;
    }
    if (a.paused) void a.play();
    else a.pause();
  };
  return (
    <Panel title="Team radio">
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setAt({ t: e.currentTarget.currentTime, d: e.currentTarget.duration || 0 })}
      />
      {!current && <p className="text-sm text-zinc-500">No radio yet.</p>}
      {current && (
        <div className="mb-3 flex items-center gap-3 overflow-hidden rounded-lg border-l-4 bg-zinc-900 p-3" style={{ borderColor: color }}>
          <button
            onClick={() => toggle(current)}
            aria-label={playing ? "Pause radio" : "Play radio"}
            title={playing ? "Pause radio" : "Play radio"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-900"
          >
            {playing ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5 translate-x-px" />}
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white">RADIO</span>
              <span className="text-lg leading-none font-bold">{driver?.tla ?? current.number}</span>
              <span className="truncate text-xs text-zinc-400">{driver ? `${driver.name} · ${driver.team}` : `#${current.number}`}</span>
              <span className="ml-auto shrink-0">
                <Levels on={playing} color={color} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={at.d}
                step={0.1}
                value={at.t}
                disabled={!at.d}
                onChange={(e) => (audio.current!.currentTime = Number(e.target.value))}
                aria-label="Seek radio"
                className="min-w-0 flex-1"
                style={{ accentColor: color }}
              />
              <span className="tabular shrink-0 font-mono text-xs text-zinc-400">
                {clip(at.t)} / {at.d ? clip(at.d) : "–:––"}
              </span>
            </div>
          </div>
        </div>
      )}
      <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
        {radios.slice(0, 30).map((r) => {
          const active = r.url === current?.url;
          return (
            <li key={r.url}>
              <button
                onClick={() => toggle(r)}
                aria-current={active}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-800 ${active ? "bg-zinc-800" : ""}`}
              >
                <span className="h-4 w-1 shrink-0 rounded-sm" style={{ background: by.get(r.number)?.color }} />
                <span className="w-10 font-semibold">{by.get(r.number)?.tla ?? r.number}</span>
                <span className="tabular font-mono text-xs text-zinc-500">{time(r.utc)}</span>
                <span className="ml-auto text-zinc-400">
                  {active && playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
