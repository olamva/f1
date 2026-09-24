# f1

A private F1 site: live timing, replays of recent sessions, and season stats with a championship clinch calculator.

- React + Vite + Tailwind in `src/web`, Hono server in `src/server`, shared logic in `src/shared`.
- Live timing comes from `livetiming.formula1.com`. Results and standings come from Jolpica-F1.
- It runs on Azure Container Apps. It scales to zero after 60 minutes without requests. A scheduled Container Apps job checks the calendar and wakes it for sessions.

## Run it

```sh
pnpm install
DEV_NO_AUTH=1 pnpm dev
pnpm test
```

## Deploy

1. Copy `infra/terraform.tfvars.example` to `infra/terraform.tfvars` and fill it in.
2. Run `terraform -chdir=infra init`, then `terraform -chdir=infra apply`.
3. Set the values of `terraform -chdir=infra output github_variables` as GitHub Actions variables.
4. Push to `main`. CI refreshes the bundled calendar, builds the image, and updates the app and wake job.
5. For a custom domain, add the records from `terraform -chdir=infra output custom_domain_dns`, set `custom_domain`, and apply. Terraform creates the certificate but does not bind it. Bind it with `az containerapp hostname bind -g f1 -n f1 --hostname <domain> --environment f1 --certificate <certificate name> --validation-method CNAME`.

The wake job checks the current and next season calendars every five minutes. It wakes the app from 15 minutes before each session until 30 minutes after its expected end. On race days, it also wakes the app every 15 minutes. This covers delayed sessions outside their planned windows. The app scales to zero after the wake requests stop. No year-specific cron rule remains.

A calendar change takes effect at the next five-minute check. If the calendar source fails, the job uses the schedule bundled during the last deployment. A deployment stops if it cannot refresh that schedule. The bundled schedule covers the seasons available when the image was built. Run `pnpm sessions` to refresh `infra/sessions.json` during local work. Terraform creates the wake job. The deployment workflow updates its image.

The server uses `F1_ORIGIN` as the base URL for F1 archives and live timing. Terraform sets it from `f1_origin`. The default is `https://livetiming.formula1.com`.

If F1 blocks Azure egress, set `f1_origin` in the ignored `infra/terraform.tfvars` to a reachable proxy origin. Serve both `/static/` and `/signalrcore` through that origin. Run `terraform -chdir=infra apply`, then verify an archive and a live session through the deployed app.
