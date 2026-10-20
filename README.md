# F1 Pitwall

F1 Pitwall is an F1 site: live timing, replays of recent sessions, and season stats with a championship clinch calculator.

Everyone can use live timing, replays, results, and stats without sign-in.
Google sign-in is necessary only for new radio transcripts, session reminders, and F1TV tokens. Transcripts use Azure Speech, so only signed-in users can start them. Everyone can read saved transcripts. `ALLOWED_EMAILS` lists the accounts that can sign in.
Each user saves an own F1TV token in Settings. The server opens a separate live connection for each token. Only that user gets the car positions.
The server keeps the tokens in `$DATA_DIR/tokens.json` with mode 0600, under a hash of the email address.

- React + Vite + Tailwind in `src/web`, Hono server in `src/server`, shared logic in `src/shared`.
- Live timing comes from `livetiming.formula1.com`. Results and standings come from Jolpica-F1.
- It runs on the Always Free Oracle VM `f1` (`VM.Standard.E2.1.Micro`, 1 GB memory, 1/8 OCPU) as the podman quadlet `f1`. `infra/oracle/` holds the VM setup.

## Run it

```sh
pnpm install
pnpm dev
pnpm test
```

`pnpm dev` turns off Google sign-in. Set `PORT` and `VITE_PORT` to run more than one dev server, such as `PORT=0 VITE_PORT=0 pnpm dev`. The value 0 selects an unused port. Set `NO_LIVE=1` to turn off live timing, so that the app shows replays during a live session.
Set `LIVE_REPLAY` to a file in `recordings/` to replay a recorded session as a live session. See the [live replay skill](.claude/skills/live-replay/SKILL.md).
The F1 archive returns HTTP 401 to local requests, so replays and the session list need the relay. Put `F1_ORIGIN=<relay URL>` in `.env.local` in the main checkout. `pnpm dev` reads that file in each worktree. A `.env.local` in the worktree overrides it.

Stop `pnpm dev` with Ctrl+C. The command stops both servers and the Node watcher.
The command checks both ports before startup.
Wait for both readiness messages before opening the printed Vite URL.
If the server prints `Failed running 'src/server/main.ts'`, read the error above it. Fix the error, or run `touch src/server/main.ts` to restart the server.
Run `DEV_WATCH=0 pnpm dev` if file watchers report `EMFILE`. Vite then polls for edits. Restart the command after server edits.
Give the command network permission if the sandbox blocks local ports.

Jolpica requests share one queue per server, including sprint qualifying requests.
The server retries HTTP 429 twice and follows `Retry-After` for waits of at most one minute.
When a cached response is old, the server sends it and refreshes it in the background.
The server preserves cached responses after a failed refresh. Longer cooldowns fail without sending more requests.
Start preview servers one at a time. Multiple servers share the upstream IP limit, but keep separate caches.
See the [Jolpica rate limits](https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md).

`scripts/circuits.py` refreshes `src/server/circuits.json`. It needs UnityPy. Run `python3 -m venv /tmp/unitypy && /tmp/unitypy/bin/pip install UnityPy && /tmp/unitypy/bin/python scripts/circuits.py`.

## T3 worktrees

Import the `Setup Worktree` action from `t3.json` in T3 project settings once.
Start each task in a new thread and worktree. The action updates the branch and installs dependencies.
Run `CI=true pnpm install --frozen-lockfile` with network permission if an install requires confirmation without a terminal.
Keep installation and checks in the same permission context. Keep dependencies separate for each worktree.
After merge, run `pnpm worktree:cleanup . <pr-number> --branch-only --apply` from the task worktree. It also deletes the remote `screenshots/pr-<pr-number>` branch.
Keep the worktree while its T3 thread is active. Remove it from another checkout after T3 stops.

## Deploy

Push to `main`. CI refreshes the bundled calendar, builds the amd64 image and pushes `ghcr.io/olamva/f1:latest`. On the VM, `podman-auto-update.timer` pulls a new image every five minutes and restarts the app.

`infra/oracle/launch.sh` launches the VM with `infra/oracle/cloud-init.yaml`. It retries until Oracle has capacity. `F1_SSH=ubuntu@<VM IP> infra/oracle/configure.sh` installs the quadlet `infra/oracle/f1.container` and the Caddy site, and restarts both. Caddy serves the app at `f1.ola-vassbotn.no`. Caddy compresses all responses except the `/api/*/stream` event streams. Caddy 2.6 holds compressed events in a buffer, so the browser gets no events. The container uses the host network on port 8080, because the host firewall rejects traffic from the podman bridge. The firewall also blocks port 8080 from outside.

The unit has `MemoryMax=700M`, and the VM has a 1 GB swap file. Run `sudo systemctl status f1` and `sudo journalctl -u f1 -f` on the VM for the memory, the state and the logs.

The quadlet sets `DATA_DIR=/srv/f1`. The server keeps the F1TV tokens, the push subscriptions, the transcripts and the pace cache in that directory. Without `DATA_DIR`, the server keeps the tokens in memory and turns off notifications.

Keep the other settings in `/etc/f1/env` on the VM, with mode 0600:

| Variable                                                 | Use                                                   |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `ALLOWED_EMAILS`                                         | The accounts that can sign in                         |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`                   | The Google OAuth client                               |
| `OIDC_AUTH_SECRET`                                       | The key of the session cookie, at least 32 characters |
| `F1_ORIGIN`                                              | The relay origin for F1 archives and live timing      |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push                                              |
| `SPEECH_ENDPOINT`, `SPEECH_KEY`                          | The Azure OpenAI account for transcripts              |
| `VOICE_ENDPOINT`, `VOICE_KEY`                            | The Azure Speech account for transcripts              |

Google sign-in uses the callback `https://<host>/.auth/login/google/callback`. The Google OAuth client must list it as an authorized redirect URI. A session lasts 30 days.

The server uses `F1_ORIGIN` as the base URL for F1 archives and live timing. The default is `https://livetiming.formula1.com`. That host refuses Oracle IP addresses, so `F1_ORIGIN` points to the Cloudflare relay in `relay/`.

Terraform in `infra/` manages the Azure resources:

1. Create `infra/terraform.tfvars` with `test -f infra/terraform.tfvars || cp infra/terraform.tfvars.example infra/terraform.tfvars`.
2. Fill the placeholders in that ignored file. Each worktree needs its own values. Keep existing values when the file exists.
3. Run `az login --scope https://storage.azure.com/.default` before `terraform -chdir=infra init` if storage authentication requires login.
4. Run `terraform -chdir=infra init`, then `terraform -chdir=infra apply`.

## Notifications

Signed-in users can turn on session reminders in Settings. On iOS, the app must be on the Home Screen. The server checks the current and next season calendars every five minutes. It sends a Web Push notification 15 minutes and 5 minutes before each session. It also sends a notification to a user one day before the F1TV login of that user expires. It removes subscriptions that the push service reports as expired.

If the calendar source fails, the server uses the schedule bundled during the last deployment. A deployment stops if it cannot refresh that schedule. Run `pnpm sessions` to refresh `infra/sessions.json` during local work.

The server keeps the subscriptions in `$DATA_DIR/push`. `VAPID_PUBLIC_KEY` is the base64url public point and `VAPID_PRIVATE_KEY` is the base64url private value, as `web-push generate-vapid-keys` prints them. A new VAPID key makes current subscriptions invalid, so users must turn notifications on again. Keep the VAPID key when you move the app.
