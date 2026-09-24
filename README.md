# f1

A private F1 site: live timing, replays of recent sessions, and season stats with a championship clinch calculator.

- React + Vite + Tailwind in `src/web`, Hono server in `src/server`, shared logic in `src/shared`.
- Live timing comes from `livetiming.formula1.com`. Results and standings come from Jolpica-F1.
- It runs on Azure Container Apps. It scales to zero and stays up for 60 minutes after the last request. Cron rules wake it for each session.

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
4. Push to `main`. CI builds the image to GHCR and deploys it.

Run `pnpm sessions` and apply again when the calendar changes. This updates the session wake windows.
