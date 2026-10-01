# F1 Pitwall

F1 Pitwall is an F1 site: live timing, replays of recent sessions, and season stats with a championship clinch calculator.

Everyone can use live timing, replays, results, and stats without sign-in.
Google sign-in is necessary only for new radio transcripts, session reminders, and F1TV tokens. Transcripts use Azure Speech, so only signed-in users can start them. Everyone can read saved transcripts. `ALLOWED_EMAILS` lists the accounts that can sign in.
Each user saves an own F1TV token in Settings. The server opens a separate live connection for each token. Only that user gets the car positions.
The server keeps each token in Key Vault under a hash of the email address.

- React + Vite + Tailwind in `src/web`, Hono server in `src/server`, shared logic in `src/shared`.
- Live timing comes from `livetiming.formula1.com`. Results and standings come from Jolpica-F1.
- It runs on Azure Container Apps. It scales to zero after 20 minutes without requests. A scheduled Container Apps job checks the calendar and wakes it for sessions. Hidden browser tabs stop polling and close their streams, so an open tab does not keep the app awake.

## Run it

```sh
pnpm install
pnpm dev
pnpm test
```

`pnpm dev` turns off Google sign-in. Set `PORT` and `VITE_PORT` to run more than one dev server, such as `PORT=8788 VITE_PORT=5174 pnpm dev`. Set `NO_LIVE=1` to turn off live timing, so that the app shows replays during a live session.

Stop `pnpm dev` with Ctrl+C. The command stops both servers and the Node watcher.
The command checks both ports before startup. Select unused ports for each worktree.
Wait for both readiness messages before opening the printed Vite URL.
Run `DEV_WATCH=0 pnpm dev` if file watchers report `EMFILE`. Vite then polls for edits. Restart the command after server edits.
Give the command network permission if the sandbox blocks local ports.

Jolpica requests share one queue per server, including sprint qualifying requests.
The server retries HTTP 429 twice and follows `Retry-After` for waits of at most one minute.
The server preserves cached responses after a failed refresh. Longer cooldowns fail without sending more requests.
Start preview servers one at a time. Multiple servers share the upstream IP limit, but keep separate caches.
See the [Jolpica rate limits](https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md).

## T3 worktrees

Import the `Setup Worktree` action from `t3.json` in T3 project settings once.
Start each task in a new thread and worktree. The action updates the branch and installs dependencies.
Run `CI=true pnpm install --frozen-lockfile` with network permission if an install requires confirmation without a terminal.
Keep installation and checks in the same permission context. Keep dependencies separate for each worktree.
After merge, run `pnpm worktree:cleanup . <pr-number> --branch-only --apply` from the task worktree.
Keep the worktree while its T3 thread is active. Remove it from another checkout after T3 stops.

## Deploy

1. Create `infra/terraform.tfvars` with `test -f infra/terraform.tfvars || cp infra/terraform.tfvars.example infra/terraform.tfvars`.
2. Fill the placeholders in that ignored file. Each worktree needs its own values. Keep existing values when the file exists.
3. Run `az login --scope https://storage.azure.com/.default` before `terraform -chdir=infra init` if storage authentication requires login.
4. Run `terraform -chdir=infra init`, then `terraform -chdir=infra apply`.
5. Set the values of `terraform -chdir=infra output github_variables` as GitHub Actions variables.
6. Push to `main`. CI refreshes the bundled calendar, builds the image, and updates the app and wake job.
7. For a custom domain, add the records from `terraform -chdir=infra output custom_domain_dns`, set `custom_domain`, and apply. Terraform creates the certificate but does not bind it. Bind it with `az containerapp hostname bind -g f1 -n f1 --hostname <domain> --environment f1 --certificate <certificate name> --validation-method CNAME`.

Use the existing Azure account and backend permissions. See the [Azure CLI login options](https://learn.microsoft.com/en-us/cli/azure/reference-index#az-login).

The wake job checks the current and next season calendars every five minutes. It wakes the app from 15 minutes before each session until two hours after its expected end. The two hours cover delayed sessions. The app scales to zero after the wake requests stop. No year-specific cron rule remains.

A calendar change takes effect at the next five-minute check. If the calendar source fails, the job uses the schedule bundled during the last deployment. A deployment stops if it cannot refresh that schedule. The bundled schedule covers the seasons available when the image was built. Run `pnpm sessions` to refresh `infra/sessions.json` during local work. Terraform creates the wake job. The deployment workflow updates its image.

The server uses `F1_ORIGIN` as the base URL for F1 archives and live timing. Terraform sets it from `f1_origin`. The default is `https://livetiming.formula1.com`.

If F1 blocks Azure egress, set `f1_origin` in the ignored `infra/terraform.tfvars` to a reachable proxy origin. Serve both `/static/` and `/signalrcore` through that origin. Run `terraform -chdir=infra apply`, then verify an archive and a live session through the deployed app.

## Notifications

Signed-in users can turn on session reminders in Settings. On iOS, the app must be on the Home Screen. The wake job sends a Web Push notification 15 minutes and 5 minutes before each session. It removes subscriptions that the push service reports as expired. The app stores subscriptions in the `push` blob container. Terraform generates the VAPID key. A new key makes current subscriptions invalid, so users must turn notifications on again.
