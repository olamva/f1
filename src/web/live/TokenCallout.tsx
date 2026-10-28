import { EyeOff, KeyRound, Settings } from "lucide-react";
import { openPath } from "../path.ts";
import { setTokenHidden } from "../tokenHidden.ts";

interface TokenCalloutProps {
  note: string;
}

export const TokenCallout = ({ note }: TokenCalloutProps) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
    <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-xl bg-zinc-950/85 p-4 text-center ring-1 ring-yellow-300/40">
      <KeyRound aria-hidden="true" className="size-6 text-yellow-300" />
      <p className="text-sm font-semibold text-yellow-300">{note}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => openPath("/settings")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white"
        >
          <Settings aria-hidden="true" className="size-4" />
          Open Settings
        </button>
        <button
          type="button"
          onClick={() => setTokenHidden(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800 px-4 py-1.5 text-sm font-semibold hover:bg-zinc-700"
        >
          <EyeOff aria-hidden="true" className="size-4" />
          Hide map
        </button>
      </div>
    </div>
  </div>
);
