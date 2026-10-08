import { useEffect, useState } from "react";
import {
  ClipboardPaste,
  Cookie,
  LogIn,
  Menu,
  Save,
  Share,
  Smartphone,
  SquarePlus,
  SquareTerminal,
} from "lucide-react";
import type { DriverInfo } from "../shared/season.ts";
import type { TokenStatus } from "../shared/token.ts";
import { DelayInput } from "./DelayInput.tsx";
import { setFavourite, useFavourite } from "./favourite.ts";
import { GlassSwitch } from "./GlassSwitch.tsx";
import { GuideSheet } from "./GuideSheet.tsx";
import { disablePush, enablePush, pushState, type PushState } from "./push.ts";
import { setSpoilerMode } from "./spoilers.ts";

const needsInstall = matchMedia("(pointer: coarse)").matches;

const PUSH_NOTES: Partial<Record<PushState, string>> = {
  unsupported: needsInstall
    ? "Add the app to the Home Screen to get notifications."
    : "This browser does not support notifications.",
  off: "Notifications are not set up on this server.",
};

const LOGIN = "https://account.formula1.com/#/en/login";
const SIGN_IN = "/.auth/login/google?post_login_redirect_uri=/settings";

const INSTALL_STEPS = [
  [Menu, "In Safari, tap the menu button in the address bar."],
  [Share, "Tap Share."],
  [SquarePlus, "Tap Add to Home Screen. You may need to tap View More."],
  [Smartphone, "Tap Add, then open F1 Pitwall from the Home Screen."],
] as const;

const TOKEN_STEPS = [
  [
    LogIn,
    <a
      href={LOGIN}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-red-400 underline"
    >
      Log in to F1TV.
    </a>,
  ],
  [
    SquareTerminal,
    "Open DevTools (⌥⌘I). Go to Application → Cookies → https://www.formula1.com.",
  ],
  [
    Cookie,
    <>
      Copy the value of <code>login-session</code>.
    </>,
  ],
  [ClipboardPaste, "Paste the value in the token box and click Save."],
] as const;

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

interface SettingsProps {
  drivers: DriverInfo[];
}

export const Settings = ({ drivers }: SettingsProps) => {
  const favourite = useFavourite();
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [denied, setDenied] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [autoplay, setAutoplay] = useState(
    () => localStorage.getItem("autoplay") === "1",
  );
  const [spoilers, setSpoilers] = useState(
    () => localStorage.getItem("spoilers") !== "0",
  );
  const [autoupdate, setAutoupdate] = useState(
    () => localStorage.getItem("autoupdate") === "1",
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
        <h2 className="font-f1 text-lg font-bold">Spoiler mode</h2>
        <GlassSwitch
          checked={spoilers}
          onChange={(checked) => {
            setSpoilers(checked);
            setSpoilerMode(checked);
          }}
        >
          Ask before showing new qualifying, sprint and race results
        </GlassSwitch>
      </section>
      <section className="bg-surface space-y-2 rounded-xl p-4">
        <h2 className="font-f1 text-lg font-bold">Favourite driver</h2>
        <p className="text-sm text-zinc-400">
          Highlight this driver in the timing tower and in Results.
        </p>
        <select
          aria-label="Favourite driver"
          value={favourite?.id ?? ""}
          onChange={(e) =>
            setFavourite(drivers.find((d) => d.id === e.target.value) ?? null)
          }
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm"
        >
          <option value="">None</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </section>
      <section className="bg-surface space-y-2 rounded-xl p-4">
        <h2 className="font-f1 text-lg font-bold">TV delay</h2>
        <p className="text-sm text-zinc-400">
          Hold live timing back by this many seconds to match your F1TV stream.
        </p>
        <DelayInput />
      </section>
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
      <section className="bg-surface space-y-2 rounded-xl p-4">
        <h2 className="font-f1 text-lg font-bold">App updates</h2>
        <GlassSwitch
          checked={autoupdate}
          onChange={(checked) => {
            setAutoupdate(checked);
            localStorage.setItem("autoupdate", checked ? "1" : "0");
          }}
        >
          Install new versions automatically
        </GlassSwitch>
      </section>
      {denied ? (
        <section className="bg-surface space-y-3 rounded-xl p-4">
          <h2 className="font-f1 text-lg font-bold">Account</h2>
          <p className="text-sm text-zinc-400">
            {denied === 401
              ? "Sign in with Google to transcribe new radio messages, get session reminders, and add your own F1TV token."
              : "Your Google account has no access to new transcripts, reminders, and F1TV tokens."}
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
          <section className="bg-surface space-y-2 rounded-xl p-4">
            <h2 className="font-f1 text-lg font-bold">Notifications</h2>
            <GlassSwitch
              checked={push === "enabled"}
              disabled={push !== "enabled" && push !== "disabled"}
              onChange={togglePush}
            >
              Notify me 15 minutes and 5 minutes before each session
            </GlassSwitch>
            {note && <p className="text-sm text-zinc-400">{note}</p>}
            {push === "unsupported" && needsInstall && (
              <GuideSheet title="Add to Home Screen" steps={INSTALL_STEPS} />
            )}
          </section>
          <section className="bg-surface space-y-2 rounded-xl p-4">
            <h2 className="font-f1 text-lg font-bold">F1TV token</h2>
            <p className="text-sm">Show the cars on the track map</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(value);
              }}
              className="flex gap-2"
            >
              <input
                aria-label="F1TV token"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  status?.sessionExpiresAt
                    ? `Saved until ${new Date(status.sessionExpiresAt).toLocaleDateString("nb-NO")}`
                    : status?.configured
                      ? "Saved"
                      : "Paste the login-session cookie value"
                }
                className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm placeholder:text-zinc-500"
              />
              <button
                disabled={!value}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
              >
                <Save aria-hidden="true" className="size-4" />
                Save
              </button>
            </form>
            {soon && (
              <p className="text-sm text-yellow-300">
                The F1TV login expires soon. Log in again and save a new token.
              </p>
            )}
            {message && <p className="text-sm text-zinc-400">{message}</p>}
            <GuideSheet title="Set the F1TV token" steps={TOKEN_STEPS}>
              <p className="text-sm text-zinc-400">
                You need an F1TV subscription. Only you see the cars from your
                token. The app renews the token until the F1TV login expires,
                which is after 30 days.
              </p>
            </GuideSheet>
          </section>
        </>
      )}
    </div>
  );
};
