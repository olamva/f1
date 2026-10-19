import { readFile } from "node:fs/promises";
import {
  loginReminders,
  reminders,
  schedule,
  type Window,
} from "../../scripts/sessions.ts";
import { notify } from "./push.ts";
import { keys, owner, status } from "./token.ts";

const SLOT_MS = 5 * 60_000;

const bundled = async (): Promise<Window[]> =>
  JSON.parse(
    await readFile(
      new URL("../../infra/sessions.json", import.meta.url),
      "utf8",
    ),
  );

async function check(now: number) {
  const windows = await schedule(now).catch((error) => {
    console.error("calendar unavailable, using bundled schedule:", error);
    return bundled();
  });
  await notify(reminders(windows, now)).catch((error) =>
    console.error("reminders failed:", error),
  );
  for (const key of keys())
    await notify(
      loginReminders(status(key).sessionExpiresAt, now),
      owner(key),
    ).catch((error) => console.error("login reminders failed:", error));
}

export function start() {
  const next = () =>
    setTimeout(
      () => {
        check(Date.now()).catch((error) =>
          console.error("reminders failed:", error),
        );
        next();
      },
      SLOT_MS - (Date.now() % SLOT_MS) + 1000,
    );
  next();
}
