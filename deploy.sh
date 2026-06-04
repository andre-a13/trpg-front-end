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

echo "==> Waiting for frontend container health"
for attempt in $(seq 1 30); do
    frontend_container="$(docker compose ps -q frontend || true)"
    if [ -n "${frontend_container}" ] && [ "$(docker inspect -f '{{.State.Running}}' "${frontend_container}")" = "true" ]; then
        if docker compose exec -T frontend wget -q --spider http://127.0.0.1/ >/dev/null 2>&1; then
            echo "Frontend container is healthy."
            break
        fi
    fi

    if [ "${attempt}" -eq 30 ]; then
        echo "ERROR: Frontend container did not become healthy."
        docker compose ps
        docker compose logs --tail=120 frontend
        exit 1
    fi

    sleep 2
done

echo "==> Checking frontend"
frontend_url="${FRONTEND_URL:-https://game.arnaud-a.dev}"
for attempt in $(seq 1 10); do
    if curl -fsSI "${frontend_url}" >/dev/null; then
        echo "Frontend is reachable: ${frontend_url}"
        break
    fi

    if [ "${attempt}" -eq 10 ]; then
        echo "ERROR: Frontend health endpoint failed: ${frontend_url}"
        docker compose ps
        docker compose logs --tail=120 frontend
        exit 1
    fi

    sleep 3
done

echo "==> Frontend status"
docker compose ps
