import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import type { Delta, Snapshot } from "../shared/timing.ts";
import {
  outlineFor,
  seasonSessions,
  replay,
  stateAt,
  type Replay,
} from "./archive.ts";
import { requireGoogle } from "./auth.ts";
import * as live from "./live.ts";
import { audio, transcript } from "./radio.ts";
import { pace, type PaceKind } from "./pace.ts";
import { records, season } from "./season.ts";
import * as token from "./token.ts";

const DIST = process.env.DIST_DIR ?? "dist";
const TICK_MS = 250;
const KEEPALIVE_MS = 20_000;

const app = new Hono();
app.use(requireGoogle);

const send = (s: SSEStreamingApi, event: string, data: unknown) =>
  s.writeSSE({ event, data: JSON.stringify(data) });

app.get("/api/season", async (c) => c.json(await season()));
app.get("/api/pace/:year/:round/:kind", async (c) => {
  const year = Number(c.req.param("year"));
  const round = Number(c.req.param("round"));
  const kind = c.req.param("kind");
  if (
    !Number.isInteger(year) ||
    year < 1950 ||
    year > new Date().getFullYear() ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > 30 ||
    (kind !== "race" && kind !== "sprint")
  )
    return c.notFound();
  return c.json(await pace(year, round, kind as PaceKind));
});
app.get("/api/records", async (c) => {
  const s = await season();
  return c.json(await records(s.drivers.map((d) => d.id)));
});

app.get("/api/token", (c) => c.json(token.status()));
app.post("/api/token", async (c) => {
  const body = await c.req.json<{ value?: string }>();
  try {
    await token.save(body.value ?? "");
    return c.json(token.status());
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

app.get("/api/live", (c) =>
  c.json({
    live: live.isLive(),
    recent: live.hasRecentTiming(),
    positions: live.hasPositions(),
    info: live.session.state.SessionInfo ?? null,
  }),
);
app.get("/api/live/laps", (c) => c.json(live.session.laps));
app.get("/api/live/outline", async (c) =>
  c.json(
    await outlineFor(live.session.state.SessionInfo, () =>
      live.session.outline(),
    ),
  ),
);
app.get("/api/live/stream", (c) =>
  streamSSE(c, async (s) => {
    const snapshot = (): Snapshot => ({
      mode: "live",
      t: Date.now(),
      duration: 0,
      state: live.session.state,
    });
    await send(s, "snapshot", snapshot());
    const off = live.subscribe((batch) =>
      batch === "reset"
        ? send(s, "snapshot", snapshot())
        : send(s, "delta", batch),
    );
    const keepalive = setInterval(
      () => s.writeSSE({ event: "ping", data: "" }),
      KEEPALIVE_MS,
    );
    await new Promise<void>((done) => s.onAbort(done));
    clearInterval(keepalive);
    off();
  }),
);

app.get("/api/radio/audio", async (c) => {
  const res = await audio(c.req.query("url") ?? "");
  return res?.ok
    ? new Response(res.body, {
        headers: {
          "content-type": "audio/mpeg",
          "cache-control": "public, max-age=86400",
        },
      })
    : c.notFound();
});
app.get("/api/radio/transcript", async (c) => {
  const turns = transcript(c.req.query("url") ?? "");
  return turns
    ? c.json({ turns: await turns })
    : c.json({ error: "Transcripts are off." }, 404);
});

app.get("/api/replay/sessions", async (c) => {
  const s = await season();
  return c.json(await seasonSessions(s.year));
});

const withReplay = async (path: string | undefined): Promise<Replay> =>
  replay(path ?? "");

const startOf = (r: Replay): number =>
  r.events.find(
    (e) =>
      e.topic === "SessionStatus" &&
      (e.data as { Status?: string }).Status === "Started",
  )?.t ?? 0;

app.get("/api/replay/laps", async (c) =>
  c.json((await withReplay(c.req.query("path"))).session.laps),
);
app.get("/api/replay/outline", async (c) => {
  const r = await withReplay(c.req.query("path"));
  return c.json(
    await outlineFor(r.session.state.SessionInfo, () => r.session.outline()),
  );
});
app.get("/api/replay/stream", async (c) => {
  const r = await withReplay(c.req.query("path"));
  const speed = Math.min(Math.max(Number(c.req.query("speed") ?? 1), 0.25), 32);
  const from = c.req.query("t") ? Number(c.req.query("t")) : startOf(r);
  return streamSSE(c, async (s) => {
    const { state, index: first } = stateAt(r, from);
    let index = first;
    await send(s, "snapshot", {
      mode: "replay",
      t: from,
      duration: r.duration,
      state,
      start: startOf(r),
    });
    let clock = from;
    let open = true;
    s.onAbort(() => {
      open = false;
    });
    while (open && index < r.events.length) {
      await s.sleep(TICK_MS);
      clock += TICK_MS * speed;
      const batch: Delta[] = [];
      for (; index < r.events.length && r.events[index]!.t <= clock; index++) {
        const e = r.events[index]!;
        batch.push([e.topic, e.data, e.t]);
      }
      await send(s, "delta", batch.length ? batch : [["Clock", null, clock]]);
    }
  });
});

app.use("/*", serveStatic({ root: DIST }));
app.get("*", serveStatic({ path: `${DIST}/index.html` }));

app.onError((e, c) => {
  console.error(e);
  return c.json({ error: e.message }, 500);
});

token
  .start()
  .catch((e) => console.error("token:", e.message))
  .finally(live.start);

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) }, (info) =>
  console.log(`listening on ${info.port}`),
);
