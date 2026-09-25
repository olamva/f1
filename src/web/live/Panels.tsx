import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useJson } from "../api.ts";
import { highlight, type Message, type Radio, type Row, type Tone } from "./view.ts";

const time = (utc: string) =>
  new Date(utc.endsWith("Z") ? utc : `${utc}Z`).toLocaleTimeString([], {
    hourCycle: "h23",
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
  rows: Row[];
}

const TONE: Record<Exclude<Tone, "car">, string> = {
  bad: "font-semibold text-red-400",
  warn: "font-semibold text-amber-300",
  good: "font-semibold text-emerald-400",
  time: "tabular font-mono text-zinc-100",
};

export const RaceControl = ({ messages, rows }: RaceControlProps) => (
  <Panel title="Race control">
    <ul className="max-h-72 space-y-2 overflow-y-auto text-sm" aria-live="polite">
      {messages.length === 0 && <li className="text-zinc-500">No messages yet.</li>}
      {messages.map((m, i) => (
        <li key={i} className="flex gap-2">
          <span className="tabular shrink-0 font-mono text-xs text-zinc-500">{time(m.utc)}</span>
          {m.flag && <span className={`shrink-0 self-start rounded px-1.5 py-0.5 text-xs font-semibold ${FLAG[m.flag.toUpperCase()] ?? "bg-zinc-600 text-white"}`}>{m.flag}</span>}
          <span>
            {highlight(m.text).map((t, j) =>
              t.tone === "car" ? (
                <span key={j} className="font-semibold" style={{ color: rows.find((r) => r.number === t.text.split(" ")[0])?.color }}>
                  {t.text}
                </span>
              ) : (
                <span key={j} className={t.tone && TONE[t.tone]}>
                  {t.text}
                </span>
              ),
            )}
          </span>
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

const Transcript = ({ url, color }: { url: string; color: string }) => {
  const { data, error } = useJson<{ turns: { speaker: "driver" | "engineer"; text: string }[] }>(
    `/api/radio/transcript?url=${encodeURIComponent(url)}`,
  );
  if (error) return null;
  if (!data) return <p className="animate-pulse text-sm font-semibold tracking-wide text-zinc-500 uppercase">Transcribing…</p>;
  return (
    <blockquote className="space-y-1 text-lg leading-snug font-bold tracking-tight uppercase">
      {data.turns.map((t, i) => (
        <p key={i} className={t.speaker === "driver" ? "text-right" : ""} style={{ color: t.speaker === "driver" ? color : "white" }}>
          {t.text}
        </p>
      ))}
    </blockquote>
  );
};

const BANDS = [150, 400, 1000, 2200, 4500];
const analysers = new WeakMap<HTMLAudioElement, AnalyserNode>();

const analyserOf = (el: HTMLAudioElement) => {
  if (!analysers.has(el)) {
    const ctx = new AudioContext();
    const a = Object.assign(ctx.createAnalyser(), { fftSize: 512, minDecibels: -75, maxDecibels: -40 });
    ctx.createMediaElementSource(el).connect(a).connect(ctx.destination);
    analysers.set(el, a);
  }
  return analysers.get(el)!;
};

const Bars = ({ audio, playing, color }: { audio: React.RefObject<HTMLAudioElement | null>; playing: boolean; color: string }) => {
  const bars = useRef<HTMLSpanElement[]>([]);
  useEffect(() => {
    if (!playing) return;
    const a = analyserOf(audio.current!);
    void (a.context as AudioContext).resume();
    const data = new Uint8Array(a.frequencyBinCount);
    const bin = (hz: number) => Math.round((hz / a.context.sampleRate) * a.fftSize);
    let frame = requestAnimationFrame(function draw() {
      a.getByteFrequencyData(data);
      bars.current.forEach((b, i) => {
        const band = data.subarray(bin(BANDS[i]!), bin(BANDS[i + 1]!));
        b.style.transform = `scaleY(${Math.max(0.1, Math.max(...band) / 255)})`;
      });
      frame = requestAnimationFrame(draw);
    });
    return () => {
      cancelAnimationFrame(frame);
      bars.current.forEach((b) => (b.style.transform = "scaleY(0.1)"));
    };
  }, [playing, audio]);
  return (
    <span className="flex h-10 items-end gap-1 self-center px-3" aria-hidden="true">
      {BANDS.slice(1).map((_, i) => (
        <span
          key={i}
          ref={(el) => void (el && (bars.current[i] = el))}
          className="h-full w-1.5 origin-bottom rounded-sm transition-transform duration-75"
          style={{ background: color, transform: "scaleY(0.1)" }}
        />
      ))}
    </span>
  );
};

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
    if (r.url !== current?.url || !a.src) {
      setUrl(r.url);
      setAt({ t: 0, d: 0 });
      a.src = `/api/radio/audio?url=${encodeURIComponent(r.url)}`;
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
        <div className="mb-3 overflow-hidden rounded-md bg-zinc-950">
          <div className="flex items-stretch">
            <span className="grid w-16 shrink-0 place-items-center text-3xl font-black text-white italic" style={{ background: color }}>
              {current.number}
            </span>
            <div className="min-w-0 flex-1 px-3 py-2 leading-none">
              <p className="truncate text-2xl font-black tracking-tight uppercase" style={{ color }}>
                {driver?.last ?? current.number}
              </p>
              <p className="text-2xl font-black tracking-tight text-white">RADIO</p>
            </div>
            <Bars audio={audio} playing={playing} color={color} />
            <button
              onClick={() => toggle(current)}
              aria-label={playing ? "Pause radio" : "Play radio"}
              title={playing ? "Pause radio" : "Play radio"}
              className="grid w-14 shrink-0 place-items-center text-white hover:bg-zinc-800"
            >
              {playing ? <Pause aria-hidden="true" className="size-6 fill-current" /> : <Play aria-hidden="true" className="size-6 fill-current" />}
            </button>
          </div>
          <div className="h-0.5 bg-zinc-800">
            <div className="h-full" style={{ width: `${at.d ? (at.t / at.d) * 100 : 0}%`, background: color }} />
          </div>
          <div className="flex min-h-28 flex-col justify-between gap-2 px-3 py-3">
            <Transcript key={current.url} url={current.url} color={color} />
            <p className="tabular font-mono text-xs text-zinc-500">
              {time(current.utc)} · {clip(at.t)} / {at.d ? clip(at.d) : "–:––"}
            </p>
          </div>
        </div>
      )}
      <ul className="max-h-60 divide-y divide-zinc-800 overflow-y-auto text-sm">
        {radios.slice(0, 30).map((r) => {
          const active = r.url === current?.url;
          const d = by.get(r.number);
          return (
            <li key={r.url}>
              <button
                onClick={() => toggle(r)}
                aria-current={active}
                className={`flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-zinc-800 ${active ? "bg-zinc-800" : ""}`}
              >
                <span className="w-7 text-center font-black italic" style={{ color: d?.color }}>
                  {r.number}
                </span>
                <span className="font-bold tracking-tight uppercase">{d?.last ?? r.number}</span>
                <span className="tabular ml-auto font-mono text-xs text-zinc-500">{time(r.utc)}</span>
                {active && playing ? <Pause aria-hidden="true" className="size-4 text-zinc-400" /> : <Play aria-hidden="true" className="size-4 text-zinc-400" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
