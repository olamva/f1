---
name: live-replay
description: Replay a recorded F1 live timing session through the local server, so that the app runs as during a live session. Use when you change or test live timing, the Live tab, the live stream, isLive, car positions, or other behavior that shows only during a live session. Also use to record a new session.
---

# Live replay

The `recordings/` directory keeps live sessions that `pnpm record` captured.
A recording keeps each message that the live feed got from F1, with its arrival time.
Run `ls recordings` to see the sessions. The file name gives the season, the event, and the session.

## Replay a session

Run the dev server with `LIVE_REPLAY`. Use unused ports:

```sh
LIVE_REPLAY=recordings/2026-bahrain-fp3.jsonl.gz LIVE_REPLAY_FROM=25 PORT=8788 VITE_PORT=5174 pnpm dev
```

- The server does not connect to F1. It sends the recorded messages to `/api/live` and `/api/live/stream` at the recorded pace.
- The server moves all timestamps to the current time. The session is live now. The session clock, the flags, and the car positions work as during the session.
- `LIVE_REPLAY_FROM` sets the start point in minutes after the start of the recording. The server applies the earlier messages immediately. The default is 0.
- The replay plays at real speed and does not loop. After the last message, the app shows the end of the session.
- `pnpm dev` restarts the server after each server edit. The replay then starts again at `LIVE_REPLAY_FROM`.
- Click "Continue to live timing" to pass the spoiler gate. Alternatively, set `localStorage.spoilers` to `"0"` before the page loads.
- A file without `Position.z` lines has no car positions. The app then shows the F1TV token note on the map.

## Find a moment

Each line is `[t, topic, data]`. `t` is the arrival time in epoch milliseconds.
Run this command to list the minute of each status change, flag, and race control message:

```sh
gunzip -c recordings/2026-bahrain-fp3.jsonl.gz | node -e 'let s="";process.stdin.on("data",(c)=>(s+=c)).on("end",()=>{const l=s.trim().split("\n").map(JSON.parse);for(const[t,k,d]of l)if(/^(SessionStatus|TrackStatus|RaceControlMessages)$/.test(k))console.log(((t-l[0][0])/6e4).toFixed(1),k,JSON.stringify(d).slice(0,100))})'
```

Use the minute as `LIVE_REPLAY_FROM`. Start one or two minutes early, so that the page connects before the moment.

## Record a session

```sh
pnpm record recordings/<year>-<event>-<session>.jsonl <end time in ISO format>
```

- Find the session times in `infra/sessions.json`.
- Start the command at least 15 minutes before the session. Set the end time at least 20 minutes after the scheduled end.
- The command writes `<file>.gz` at the end time and deletes the raw file. Commit the `.gz` file.
- Set `KEY_VAULT_NAME` in `.env.local` to record car positions. The command then uses an F1TV token from Key Vault. Without a token, the recording has no car positions.
- The command records only the topics in `TOPICS` in `src/server/timing.ts`. A new topic needs a new recording.
