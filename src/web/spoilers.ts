import { useSyncExternalStore } from "react";
import type { Round } from "../shared/season.ts";

export const KINDS = ["sprintQualifying", "sprint", "qualifying", "race"];
const EARLY = 30 * 60_000;

export type Seen = Record<string, "shown" | "hidden">;
export type Session = { id: string; round: Round; kind: string; at: number };

const listeners = new Set<() => void>();

const subscribe = (change: () => void) => {
  listeners.add(change);
  return () => void listeners.delete(change);
};

const save = (key: string, value: string) => {
  localStorage.setItem(key, value);
  listeners.forEach((change) => change());
};

export const setSpoilerMode = (on: boolean) => save("spoilers", on ? "1" : "0");

export const setSeen = (sessions: Session[], state: Seen[string]) =>
  save(
    "seen",
    JSON.stringify({
      ...JSON.parse(localStorage.getItem("seen") ?? "{}"),
      ...Object.fromEntries(sessions.map((s) => [s.id, state])),
    }),
  );

export const useSeen = (): Seen | null => {
  const on = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("spoilers") !== "0",
  );
  const seen = useSyncExternalStore(subscribe, () =>
    localStorage.getItem("seen"),
  );
  return on ? JSON.parse(seen ?? "{}") : null;
};

const sessions = (rounds: Round[]): Session[] =>
  rounds
    .flatMap((round) =>
      Object.entries(round.sessions)
        .filter((e): e is [string, string] => e[1] !== null)
        .map(([kind, at]) => ({
          id: `${at.slice(0, 4)}/${round.round}/${kind}`,
          round,
          kind,
          at: Date.parse(at),
        })),
    )
    .sort((a, b) => a.at - b.at);

export const fresh = (rounds: Round[], now: number) => {
  const past = sessions(rounds).filter(
    (s) => KINDS.includes(s.kind) && s.at <= now,
  );
  return past.filter((s) => s.round === past.at(-1)?.round);
};

export const onLiveTab = (rounds: Round[], now: number, live: boolean) => {
  const all = sessions(rounds);
  return live
    ? all.findLast((s) => s.at <= now + EARLY)
    : all.find((s) => s.at > now);
};
