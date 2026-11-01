# Ticketing

Monorepo for the ticketing platform. Architecture: `../Architecture/Plan/revised_plan.md`. Tests: `../Architecture/Plan/test_plan.md`.

| Path | What |
|---|---|
| `apps/api` | Node.js + Express + Mongoose API |
| `apps/web` | Next.js (App Router) web app |
| `apps/mobile` | Expo scaffold (post-v1) |
| `packages/shared` | Enums, types, Zod schemas, permissions, error codes |
| `packages/api-client` | Typed HTTP client for web + mobile |

## Requirements

Node 20.6+ and pnpm 9 (`corepack enable` picks the version from `package.json`).

## Local dev

```sh
cp .env.example .env                 # then set real JWT secrets
docker compose up -d mongo mailpit   # Mailpit UI: http://localhost:8025
pnpm install
pnpm build                           # builds packages/shared + api-client once
pnpm seed                            # creates the first Super Admin from BOOTSTRAP_ADMIN_*
pnpm dev                             # API on http://localhost:4000/api/v1
```

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test          # API tests use an in-memory MongoDB, no services needed
```

## API (Phase 1)

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/v1/health` | Liveness |
| POST | `/api/v1/auth/login` | Returns `accessToken`; sets httpOnly `refresh_token` cookie |
| POST | `/api/v1/auth/refresh` | Rotates the refresh cookie |
| POST | `/api/v1/auth/logout` | Bearer token required |
| POST | `/api/v1/auth/forgot-password` | Always 202 |
| POST | `/api/v1/auth/reset-password` | Signs out all sessions, starts a new one |
| POST | `/api/v1/auth/invite/accept` | Activates an invited user, starts a session |
| GET | `/api/v1/me` | User + project memberships |
| PATCH | `/api/v1/me/password` | Requires current password |
