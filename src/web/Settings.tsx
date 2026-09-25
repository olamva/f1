import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import type { TokenStatus } from "../shared/token.ts";
import { getJson } from "./api.ts";

const LOGIN = "https://account.formula1.com/#/en/login";

const date = (ms: number | null) => (ms ? new Date(ms).toLocaleString("nb-NO") : "—");

async function post(value: string): Promise<TokenStatus> {
  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error);
  return body;
}

export const Settings = () => {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [value, setValue] = useState("");
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem("autoplay") === "1");
  const [message, setMessage] = useState<string | null>(null);
  const save = (v: string) =>
    post(v).then(
      (s) => {
        setStatus(s);
        setValue("");
        setMessage("Saved. The live feed reconnects with the token.");
      },
      (e: Error) => setMessage(e.message),
    );
  useEffect(() => {
    getJson<TokenStatus>("/api/token").then(setStatus, () => undefined);
  }, []);
  const soon = status?.sessionExpiresAt && status.sessionExpiresAt - Date.now() < 3 * 24 * 3600_000;
  return (
    <div className="max-w-2xl space-y-4">
      <section className="space-y-2 rounded-xl bg-surface p-4">
        <h2 className="text-lg font-semibold">Team radio</h2>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={autoplay}
            onChange={(e) => {
              setAutoplay(e.target.checked);
              localStorage.setItem("autoplay", e.target.checked ? "1" : "0");
            }}
          />
          <span className="relative h-5 w-9 shrink-0 rounded-full bg-zinc-700 transition-colors peer-checked:bg-red-600 peer-focus-visible:ring-2 peer-focus-visible:ring-red-400 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
          Play new radio messages automatically
        </label>
      </section>
      <section className="space-y-2 rounded-xl bg-surface p-4">
        <h2 className="text-lg font-semibold">F1TV token</h2>
        <p className="text-sm text-zinc-400">
          The car positions on the track map need an F1TV subscription token. The app renews the token every few days until the F1TV login expires, which is after 30 days.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
          <dt className="text-zinc-500">Status</dt>
          <dd>{status?.configured ? "Set" : "Not set"}</dd>
          <dt className="text-zinc-500">Token expires</dt>
          <dd>{date(status?.expiresAt ?? null)}</dd>
          <dt className="text-zinc-500">Login expires</dt>
          <dd className={soon ? "font-semibold text-yellow-300" : ""}>{date(status?.sessionExpiresAt ?? null)}</dd>
        </dl>
        {soon && <p className="text-sm text-yellow-300">The F1TV login expires soon. Log in again and save a new token.</p>}
      </section>
      <section className="space-y-3 rounded-xl bg-surface p-4 text-sm">
        <h3 className="font-semibold">Set the token</h3>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-300">
          <li>
            <a href={LOGIN} target="_blank" rel="noreferrer" className="font-semibold text-red-400 underline">
              Log in to F1TV
            </a>
            .
          </li>
          <li>
            Open DevTools (⌥⌘I) → Application → Cookies → https://www.formula1.com. Copy the value of <code>login-session</code> and paste it in the box.
          </li>
        </ol>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="login-session cookie value, or the token itself"
          className="h-24 w-full rounded-md bg-zinc-900 p-2 font-mono text-xs"
        />
        <button onClick={() => save(value)} disabled={!value} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 font-semibold disabled:opacity-40">
          <Save aria-hidden="true" className="size-4" />
          Save token
        </button>
        {message && <p className="text-zinc-300">{message}</p>}
      </section>
    </div>
  );
};
