import { readFileSync } from "node:fs";
import { schedule, shouldWake, type Window } from "./sessions.ts";

const now = Date.now();
let windows: Window[];
try {
  windows = await schedule(now);
} catch (error) {
  console.error("calendar unavailable, using bundled schedule:", error);
  windows = JSON.parse(
    readFileSync(new URL("../infra/sessions.json", import.meta.url), "utf8"),
  );
}
if (shouldWake(windows, now)) {
  const response = await fetch(process.env.WAKE_URL!, {
    signal: AbortSignal.timeout(30_000),
    redirect: "manual",
  });
  if (!response.ok && response.status !== 401 && response.status !== 302)
    throw new Error(`wake failed: ${response.status}`);
}
