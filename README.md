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

## API contract and generated client

Use Node 22.18+ and `npm ci`. Backend Pydantic schemas are the source of truth.
After exporting the backend contract, import and regenerate locally:

```bash
npm run api:import -- --source ../trpg-backend/contracts/openapi.json
npm run api:generate
npm run api:check
npm run test:api
npm run test:types
npm run test:forge
```

To verify real HTTP exchanges against an isolated local backend, install the
backend dependencies in its sibling `.venv`, then run:

```bash
npm run test:integration
```

This starts FastAPI on a free loopback port with a fresh SQLite test database,
runs nine SDK/service integration scenarios, then stops the API. Test artifacts
are kept under `node_modules/.cache/trpg-api/integration-*`. The runner overrides
database, authentication and snapshot settings; it does not use campaign data.

`contracts/source.json` records the schema hash and its producer revision. A local
working-tree import has a null revision; automated imports supply `--backend-sha`.
Commit the contract and generated output together. Edit schemas and adapters,
then regenerate; generated files are not hand-maintained. CI verifies regeneration,
transport tests, existing tests, lint and build without requiring a live backend.

The backend automation opens contract PRs after its checks pass. It uses a
dedicated GitHub App so the generated PR triggers this repository's CI. Its
activation and credentials are documented in the backend README.

Hey API is pinned to 0.99.0 and Vitest to 5.0.5. The parser's `js-yaml` dependency
is overridden to compatible version 4.3.2 to apply its security fixes.

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
