# Ticketing

Monorepo for the ticketing platform. Architecture: `../Architecture/Plan/revised_plan.md`.

| Path | What |
|---|---|
| `apps/api` | Node.js + Express + Mongoose API |
| `apps/web` | Next.js (App Router) web app |
| `apps/mobile` | Expo scaffold (post-v1) |
| `packages/shared` | Enums, types, Zod schemas, permissions, error codes |
| `packages/api-client` | Typed HTTP client for web + mobile |

## Local dev

```sh
cp .env.example .env
docker compose up -d mongo mailpit   # Mailpit UI: http://localhost:8025
pnpm install
pnpm dev
```
