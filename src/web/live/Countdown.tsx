import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Fact, Round } from "../../shared/season.ts";
import { useJson } from "../api.ts";
import { Flag } from "../Flag.tsx";

export const LABEL: Record<string, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprintQualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};
const MINUTES: Record<string, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprintQualifying: 45,
  sprint: 60,
  qualifying: 60,
  race: 120,
};
const KIND: Record<string, Fact["sessions"][number]> = {
  sprintQualifying: "qualifying",
  qualifying: "qualifying",
  sprint: "race",
  race: "race",
};

interface CountdownProps {
  rounds: Round[];
}

const next = (rounds: Round[], now: number) =>
  rounds
    .flatMap((r) =>
      Object.entries(r.sessions)
        .filter((e): e is [string, string] => e[1] !== null)
        .map(([k, at]) => ({
          round: r,
          session: k,
          label: LABEL[k] ?? k,
          at: Date.parse(at),
        })),
    )
    .filter((s) => s.at > now)
    .sort((a, b) => a.at - b.at)[0];

export const current = (rounds: Round[], now: number) =>
  rounds
    .flatMap((r) =>
      Object.entries(r.sessions)
        .filter((e): e is [string, string] => e[1] !== null)
        .map(([k, at]) => ({
          round: r,
          label: LABEL[k] ?? k,
          at: Date.parse(at),
          minutes: MINUTES[k] ?? 60,
        })),
    )
    .find(
      (s) =>
        now >= s.at - 15 * 60_000 && now <= s.at + (s.minutes + 30) * 60_000,
    );

const span = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return d ? `${d}d ${hms}` : hms;
};

interface SessionTitleProps {
  round: Round;
  label: string;
}

const SessionTitle = ({ round, label }: SessionTitleProps) => {
  const title = useRef<HTMLHeadingElement>(null);
  const sep = useRef<HTMLSpanElement>(null);
  const tail = useRef<HTMLSpanElement>(null);
  const [wrapped, setWrapped] = useState(false);
  useLayoutEffect(() => {
    const el = title.current;
    if (!el) return;
    const measure = () =>
      setWrapped(
        (tail.current?.offsetTop ?? 0) > (sep.current?.offsetTop ?? 0),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [round.name, label]);
  return (
    <h1
      ref={title}
      className="font-f1 text-xl font-bold sm:text-3xl xl:text-[2.6vw]"
    >
      <Flag country={round.country} />
      {round.name}
      <span ref={sep} className={wrapped ? "invisible" : undefined}>
        {" ·"}
      </span>{" "}
      <span ref={tail}>{label}</span>
    </h1>
  );
};

interface FactsProps {
  circuit: string;
  year: number;
  session: string;
}

const Facts = ({ circuit, year, session }: FactsProps) => {
  const { data } = useJson<Fact[]>(`/api/facts/${circuit}/${year}`);
  const [index, setIndex] = useState(0);
  const matching = data?.filter((f) => f.sessions.includes(KIND[session]));
  const facts = matching?.length ? matching : (data ?? []);
  const fact = facts[index % facts.length];
  if (!fact) return null;
  return (
    <span
      onAnimationIteration={() => setIndex((i) => i + 1)}
      className={`absolute inset-x-4 bottom-[calc(21px+62px+12px)] text-sm text-zinc-400 sm:bottom-6 xl:text-[1vw] ${facts.length > 1 ? "animate-fact" : ""}`}
    >
      {fact.text}
    </span>
  );
};

export const Countdown = ({ rounds }: CountdownProps) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = next(rounds, now);
  if (!s) return null;
  return (
    <section className="fixed inset-0 isolate grid content-center justify-items-center gap-3 px-4 text-center xl:gap-[1vw]">
      <div className="spotlight fixed inset-0 -z-10" />
      <span className="font-f1-wide text-sm text-zinc-300 uppercase xl:text-[1.1vw]">
        Next up
      </span>
      <SessionTitle round={s.round} label={s.label} />
      <span className="tabular font-f1 text-[11vw] font-bold whitespace-nowrap md:text-8xl xl:text-[10vw]">
        {span(s.at - now)}
      </span>
      <span className="text-zinc-400 xl:text-[1.4vw]">
        {new Date(s.at).toLocaleString([], {
          weekday: "long",
          day: "numeric",
          month: "long",
          hourCycle: "h23",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <Facts
        circuit={s.round.circuitId}
        year={new Date(s.at).getUTCFullYear()}
        session={s.session}
      />
    </section>
  );
};
