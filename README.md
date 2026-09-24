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
5. For a custom domain, add the records from `terraform -chdir=infra output custom_domain_dns`, set `custom_domain`, and apply. Terraform creates the certificate but does not bind it. Bind it with `az containerapp hostname bind -g f1 -n f1 --hostname <domain> --environment f1 --certificate <certificate name> --validation-method CNAME`.

Run `pnpm sessions` and apply again when the calendar changes. This updates the session wake windows.

If F1 blocks Azure egress, set `f1_origin` in the ignored `infra/terraform.tfvars` to a reachable proxy origin. Serve both `/static/` and `/signalrcore` through that origin. Run `terraform -chdir=infra apply`, then verify an archive and a live session through the deployed app.
