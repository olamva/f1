import { useEffect, useState } from "react";
import { LogIn, Save } from "lucide-react";
import type { TokenStatus } from "../shared/token.ts";
import { GlassSwitch } from "./GlassSwitch.tsx";
import { InstallSheet } from "./InstallSheet.tsx";
import { disablePush, enablePush, pushState, type PushState } from "./push.ts";

const PUSH_NOTES: Partial<Record<PushState, string>> = {
  unsupported: "Add the app to the Home Screen to get notifications.",
  off: "Notifications are not set up on this server.",
};

const LOGIN = "https://account.formula1.com/#/en/login";
const SIGN_IN = "/.auth/login/google?post_login_redirect_uri=/settings";

const date = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("nb-NO") : "—";

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
  const [denied, setDenied] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [autoplay, setAutoplay] = useState(
    () => localStorage.getItem("autoplay") === "1",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [push, setPush] = useState<PushState | null>(null);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const togglePush = (on: boolean) => {
    setPush(null);
    setPushNote(null);
    (on ? enablePush() : disablePush())
      .catch((e: Error) => setPushNote(e.message))
      .then(pushState)
      .then(setPush, () => setPush("disabled"));
  };
  const save = (v: string) =>
    post(v).then(
      (s) => {
        setStatus(s);
        setValue("");
        setMessage("Saved. Reload the app to see the cars.");
      },
      (e: Error) => setMessage(e.message),
    );
  useEffect(() => {
    fetch("/api/token").then(
      async (res) =>
        res.ok ? setStatus(await res.json()) : setDenied(res.status),
      () => undefined,
    );
    pushState().then(setPush, (e: Error) => setPushNote(e.message));
  }, []);
  const note = pushNote ?? (push && PUSH_NOTES[push]);
  const soon =
    status?.sessionExpiresAt &&
    status.sessionExpiresAt - Date.now() < 3 * 24 * 3600_000;
  return (
    <div className="max-w-2xl space-y-4">
      <section className="bg-surface space-y-2 rounded-xl p-4">
        <h2 className="font-f1 text-lg font-bold">Team radio</h2>
        <GlassSwitch
          checked={autoplay}
          onChange={(checked) => {
            setAutoplay(checked);
            localStorage.setItem("autoplay", checked ? "1" : "0");
          }}
        >
          Play new radio messages automatically
        </GlassSwitch>
      </section>
      {denied ? (
        <section className="bg-surface space-y-3 rounded-xl p-4">
          <h2 className="font-f1 text-lg font-bold">Account</h2>
          <p className="text-sm text-zinc-400">
            {denied === 401
              ? "Sign in with Google to get radio transcripts, session reminders, and your own F1TV token."
              : "Your Google account has no access to transcripts, reminders, and F1TV tokens."}
          </p>
          {denied === 401 && (
            <a
              href={SIGN_IN}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold"
            >
              <LogIn aria-hidden="true" className="size-4" />
              Sign in with Google
            </a>
          )}
        </section>
      ) : (
        <>
          <section className="bg-surface space-y-2 rounded-xl p-4 pointer-fine:hidden">
            <h2 className="font-f1 text-lg font-bold">Notifications</h2>
            <GlassSwitch
              checked={push === "enabled"}
              disabled={push !== "enabled" && push !== "disabled"}
              onChange={togglePush}
            >
              Notify me 15 minutes and 5 minutes before each session
            </GlassSwitch>
            {note && <p className="text-sm text-zinc-400">{note}</p>}
            {push === "unsupported" && <InstallSheet />}
          </section>
          <section className="bg-surface space-y-2 rounded-xl p-4">
            <h2 className="font-f1 text-lg font-bold">F1TV token</h2>
            <p className="text-sm text-zinc-400">
              The car positions on the track map need an F1TV subscription
              token. Only you see the cars from your token. The app renews the
              token every few days until the F1TV login expires, which is after
              30 days.
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
              <dt className="text-zinc-500">Status</dt>
              <dd>{status?.configured ? "Set" : "Not set"}</dd>
              <dt className="text-zinc-500">Token expires</dt>
              <dd>{date(status?.expiresAt ?? null)}</dd>
              <dt className="text-zinc-500">Login expires</dt>
              <dd className={soon ? "font-semibold text-yellow-300" : ""}>
                {date(status?.sessionExpiresAt ?? null)}
              </dd>
            </dl>
            {soon && (
              <p className="text-sm text-yellow-300">
                The F1TV login expires soon. Log in again and save a new token.
              </p>
            )}
          </section>
          <section className="bg-surface space-y-3 rounded-xl p-4 text-sm">
            <h3 className="font-f1 font-bold">Set the token</h3>
            <ol className="list-decimal space-y-1 pl-5 text-zinc-300">
              <li>
                <a
                  href={LOGIN}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-red-400 underline"
                >
                  Log in to F1TV
                </a>
                .
              </li>
              <li>
                Open DevTools (⌥⌘I) → Application → Cookies →
                https://www.formula1.com. Copy the value of{" "}
                <code>login-session</code> and paste it in the box.
              </li>
            </ol>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="login-session cookie value, or the token itself"
              className="h-24 w-full rounded-md bg-zinc-900 p-2 font-mono text-xs"
            />
            <button
              onClick={() => save(value)}
              disabled={!value}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 font-semibold disabled:opacity-40"
            >
              <Save aria-hidden="true" className="size-4" />
              Save token
            </button>
            {message && <p className="text-zinc-300">{message}</p>}
          </section>
        </>
      )}
    </div>
  );
};
