# Web (`@ticketing/web`)

Next.js (App Router) + TypeScript + TanStack Query. This is the UI for every role. All business rules are enforced by the [API](../api/README.md).

> **Status:** every route exists as a placeholder page. Real screens arrive from Phase 2 (projects) onward.

Do the first-time setup in the [main README](../../README.md#2-first-time-setup) first: install pnpm, run `pnpm install`, and run `pnpm build`.

---

## Run

From `Application/`:

```sh
pnpm --filter @ticketing/web dev
```

Or from this folder (`apps/web/`):

```sh
pnpm dev
```

Open <http://localhost:3000>. The page reloads automatically when you edit files in `src/`.

The web app talks to the API, so for anything beyond the placeholders start the API too (or run `pnpm dev` from `Application/` to start both).

### API address

The client calls `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:4000/api/v1`. To change it, create `apps/web/.env.local`:

```sh
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

The web origin (`http://localhost:3000`) must be listed in the API's `APP_ORIGIN`, or the browser will block requests (CORS).

---

## Scripts

| Script | What it does |
|---|---|
| `dev` | Dev server on port 3000 |
| `build` | Production build (`.next/`, standalone output) |
| `start` | Serve the production build on port 3000 (run `build` first) |
| `lint` | ESLint |
| `typecheck` | TypeScript check |

---

## Routes

| Route | Screen | Who |
|---|---|---|
| `/login` | Login / accept invite / reset password | All |
| `/admin` | Multi-project dashboard | Super Admin |
| `/admin/projects/new`, `/admin/projects/[id]/edit` | Project form | Super Admin |
| `/admin/users` | User dashboard | Super Admin |
| `/projects` | My projects | All |
| `/projects/[id]` | Insights + ticket list | Project members |
| `/projects/[id]/members` | Members and roles | Super Admin, Project Head |
| `/projects/[id]/tickets/new` | Create ticket | All project roles |
| `/tickets/[id]` | Ticket detail | Per permissions |
| `/my-tickets` | Assigned to me / created by me | All |

---

## Folder layout

```
src/
├── app/            Routes (one folder per URL, page.tsx = the screen)
├── components/     Shared UI, e.g. <Can perm="..."> to hide actions by role
├── lib/api.ts      API client from @ticketing/api-client
└── middleware.ts   Login redirect (pass-through for now)
```

Shared types, Zod schemas and the permission matrix come from `@ticketing/shared`. If you change that package while `pnpm dev` is not running, run `pnpm build` from `Application/` so the web app picks up the change.
