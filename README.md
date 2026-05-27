# TRPG Frontend

Standalone Vite and React frontend for the TRPG tools that previously lived inside `react-portfolio`.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Configure the API URL in `.env`:

```env
VITE_TRPG_API_URL=http://localhost:8000
```

## Commands

```bash
npm run lint
npm run build
```

## VPS Deploy

This project is served as a static Vite build through its own internal Caddy
container. The public gateway routes `game.arnaud-a.dev` to this service.

Make sure the shared Docker network exists first. The `vps-gateway` project
creates it when started:

```bash
cd ../vps-gateway
docker compose up -d
```

Then start this app:

```bash
cd ../trpg-frontend
docker compose up -d --build
```

The production API URL is compiled into the Vite build. Override it at build
time if needed:

```bash
VITE_TRPG_API_URL=https://api.arnaud-a.dev docker compose up -d --build
```
