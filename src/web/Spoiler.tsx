import { Eye, EyeOff } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import type { Round, Season } from "../shared/season.ts";
import { Flag } from "./Flag.tsx";
import { current, LABEL } from "./live/Countdown.tsx";
import { Loading } from "./Loading.tsx";
import { fresh, KINDS, onLiveTab, setSeen, useSeen } from "./spoilers.ts";
import { useActive } from "./Swipe.tsx";
import { useVisible } from "./visible.ts";

export const useLiveSpoiler = (rounds: Round[] | undefined, live: boolean) => {
  const seen = useSeen();
  const active = useActive();
  const visible = useVisible();
  const now = Date.now();
  const session =
    rounds && onLiveTab(rounds, now, live || !!current(rounds, now));
  const state =
    seen && session && KINDS.includes(session.kind)
      ? seen[session.id]
      : "shown";
  const ahead = !!session && session.at > now;
  useEffect(() => {
    if (active && visible && session && !state && (ahead || live))
      setSeen([session], ahead ? "shown" : "hidden");
  });
  return {
    hidden: live && !ahead && state !== "shown",
    reveal: () => session && setSeen([session], "shown"),
  };
};

interface SpoilerProps {
  season: Season | null;
  year: number;
  kinds: string[];
  round?: number;
  children: ReactNode;
}

export const Spoiler = ({
  season,
  year,
  kinds,
  round,
  children,
}: SpoilerProps) => {
  const seen = useSeen();
  if (!seen || year !== (season?.year ?? new Date().getUTCFullYear()))
    return children;
  if (!season) return <Loading label="Loading the season…" />;
  const pending = fresh(season.rounds, Date.now()).filter(
    (s) =>
      kinds.includes(s.kind) &&
      (round ?? s.round.round) === s.round.round &&
      seen[s.id] !== "shown",
  );
  const unasked = pending.filter((s) => !seen[s.id]);
  const shown = unasked.length ? unasked : pending;
  if (!shown.length) return children;
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-sm">
      <EyeOff aria-hidden="true" className="size-8 text-red-500" />
      <div>
        <h2 className="font-f1 font-bold">
          <Flag country={shown[0].round.country} />
          {shown[0].round.name} ·{" "}
          {new Intl.ListFormat("en").format(shown.map((s) => LABEL[s.kind]))}
        </h2>
        <p className="mt-1 text-zinc-400">
          {unasked.length
            ? "New results are available. Do you want to see them?"
            : "Spoiler mode hides these results."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setSeen(shown, "shown")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 font-semibold"
        >
          <Eye aria-hidden="true" className="size-4" />
          Reveal
        </button>
        {unasked.length > 0 && (
          <button
            onClick={() => setSeen(shown, "hidden")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-4 py-1.5 font-semibold hover:bg-zinc-700"
          >
            <EyeOff aria-hidden="true" className="size-4" />
            Hide
          </button>
        )}
      </div>
    </div>
  );
};
