#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if ! docker network inspect web >/dev/null 2>&1; then
    echo "ERROR: Docker network 'web' does not exist. Deploy vps-gateway-project first."
    exit 1
fi

export VITE_TRPG_API_URL="${VITE_TRPG_API_URL:-https://api.arnaud-a.dev}"

echo "==> Validating frontend Docker Compose config"
docker compose config >/dev/null

echo "==> Deploying frontend with VITE_TRPG_API_URL=${VITE_TRPG_API_URL}"
docker compose up -d --build

echo "==> Checking frontend"
curl -fsSI "${FRONTEND_URL:-https://game.arnaud-a.dev}" >/dev/null

echo "==> Frontend status"
docker compose ps
