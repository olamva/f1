#!/bin/bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
host="${F1_SSH:?Set F1_SSH to ubuntu@<VM IP>.}"

put() { ssh "$host" "sudo install -D -m $1 /dev/stdin $2"; }

put 644 /etc/containers/systemd/f1.container < "$here/f1.container"
printf 'f1.ola-vassbotn.no {\n\t@compress not path /api/*/stream\n\tencode @compress zstd gzip\n\treverse_proxy 127.0.0.1:8080\n}\n' | put 644 /etc/caddy/Caddyfile

ssh "$host" 'sudo systemctl daemon-reload && sudo systemctl restart f1 && sudo systemctl reload caddy'
