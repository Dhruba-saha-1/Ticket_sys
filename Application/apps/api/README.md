# API (`@ticketing/api`)

Node.js + Express + Mongoose. All business rules live here; the web and mobile apps are UI only.

Do the first-time setup in the [main README](../../README.md#2-first-time-setup) first: install pnpm, run `pnpm install`, create `.env`, start Docker and run `pnpm build`.

---

## Run

From `Application/`:

```sh
docker compose up -d mongo mailpit   # if not already running
pnpm --filter @ticketing/api dev
```

Or from this folder (`apps/api/`):

```sh
pnpm dev
```

The API listens on <http://localhost:4000>, and every route is under `/api/v1`. It restarts automatically when you change a file in `src/`.

The `dev` and `seed` scripts load the environment from **`Application/.env`** (two folders up), not from this folder.

### First Super Admin

```sh
pnpm seed
```

This creates an active Super Admin from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`, but only when the `users` collection is empty. Running it again does nothing. There is no public sign-up.

### Emails

Locally, every email (invites, password resets) is caught by Mailpit. Open <http://localhost:8025> to read them and click their links.

---

## Scripts

Run with `pnpm <script>` from this folder, or `pnpm --filter @ticketing/api <script>` from `Application/`.

| Script | What it does |
|---|---|
| `dev` | Run from source with auto-restart (tsx watch) |
| `build` | Compile TypeScript to `dist/` |
| `start` | Run the compiled build: `node dist/server.js` (needs env vars set in the shell) |
| `seed` | Create the first Super Admin (from source) |
| `seed:prod` | Same, from the compiled build |
| `test` | Unit and integration tests |
| `lint` | ESLint |
| `typecheck` | TypeScript check of `src` and `tests` |

---

## Environment variables

Defined and validated in [`src/config/env.ts`](src/config/env.ts). The API refuses to start if any are invalid, and the error names the bad variable.

| Variable | Required | Default | Notes |
|---|:-:|---|---|
| `NODE_ENV` | | `development` | `development`, `test` or `production`. `production` makes the refresh cookie `Secure`. |
| `PORT` | | `4000` | |
| `LOG_LEVEL` | | `info` | Use `debug` for more detail, `silent` for none |
| `MONGODB_URI` | ✅ | | e.g. `mongodb://localhost:27017/ticketing` or an Atlas URI |
| `JWT_ACCESS_SECRET` | ✅ | | 32+ characters. Signs access tokens. |
| `JWT_REFRESH_SECRET` | ✅ | | 32+ characters, different from the access secret. Used to hash stored tokens. |
| `SMTP_HOST` | ✅ | | `localhost` for Mailpit. Production: `smtp.hostinger.com` or `smtpout.secureserver.net`. |
| `SMTP_PORT` | | `587` | `1025` for Mailpit. `465` switches on SSL. |
| `SMTP_USER`, `SMTP_PASS` | | empty | Leave empty for Mailpit |
| `MAIL_FROM` | ✅ | | e.g. `"Ticketing <no-reply@yourdomain.com>"` |
| `APP_ORIGIN` | ✅ | | Web app URL(s), comma-separated. Used for CORS. The first one is used in email links. |
| `API_ORIGIN` | ✅ | | Public URL of this API |
| `RATE_LIMIT_ENABLED` | | `true` | Set `false` only for local debugging |
| `BOOTSTRAP_ADMIN_EMAIL` | for `seed` | | |
| `BOOTSTRAP_ADMIN_PASSWORD` | for `seed` | | 8+ characters |
| `BOOTSTRAP_ADMIN_NAME` | | `Super Admin` | |

---

## Endpoints (Phase 1)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/health` | — | Liveness check |
| POST | `/api/v1/auth/login` | — | Body `{ email, password }`. Returns `{ accessToken, user }` and sets the `refresh_token` cookie. |
| POST | `/api/v1/auth/refresh` | refresh cookie | Issues a new access token and replaces the cookie. Reusing an old token signs the user out everywhere. |
| POST | `/api/v1/auth/logout` | Bearer | Revokes the current refresh token |
| POST | `/api/v1/auth/forgot-password` | — | Body `{ email }`. Always 202. Emails a 1-hour reset link to active users. |
| POST | `/api/v1/auth/reset-password` | — | Body `{ token, password }`. Signs out all sessions and starts a new one. |
| POST | `/api/v1/auth/invite/accept` | — | Body `{ token, password }`. Activates an invited user (link valid 72 hours). |
| GET | `/api/v1/me` | Bearer | `{ user, memberships }` |
| PATCH | `/api/v1/me/password` | Bearer | Body `{ currentPassword, newPassword }` |

- **Access token:** send it as `Authorization: Bearer <accessToken>`. It expires after 15 minutes; call `/auth/refresh` to get a new one.
- **Errors:** always `{ "error": { "code": "...", "message": "..." } }`. The codes are listed in [`packages/shared/src/errors.ts`](../../packages/shared/src/errors.ts).
- **Rate limits:** login, forgot password, reset password and invite accept allow 10 requests per 15 minutes per IP. Signed-in users get 120 writes and 300 reads per minute.

Try it with curl:

```sh
# Log in and keep the refresh cookie in cookies.txt
curl -c cookies.txt -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@yourdomain.com","password":"change-me-please"}'

# Use the accessToken from the response
curl http://localhost:4000/api/v1/me -H 'Authorization: Bearer <accessToken>'

# Get a new access token using the cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:4000/api/v1/auth/refresh
```

---

## Tests

```sh
pnpm test                                          # everything
pnpm test -- tests/integration/auth.login.test.ts  # one file
pnpm test -- -t "rotates the refresh token"        # tests whose name matches
pnpm test -- --watch                               # re-run on change
```

- No Docker or `.env` needed. Integration tests start an **in-memory MongoDB** and replace SMTP with a fake that records emails.
- The first run downloads a MongoDB binary (about 66 MB) to `node_modules/.cache`.
- `tests/unit/`: pure logic (tokens, mailer retries, permission checks).
- `tests/integration/`: real HTTP requests through Supertest.
- `tests/helpers/`: test database, fake mail, and user and token factories.

---

## Folder layout

```
src/
├── app.ts              Express app (middleware + routes under /api/v1)
├── server.ts           Entry point: connect DB, register email subscribers, listen
├── config/             env validation, MongoDB connection, logger
├── lib/                AppError, token and password helpers
├── middleware/         authenticate · loadProjectRole · authorize · validate · rate limits · errors
├── models/             Mongoose models
├── events/             In-process event bus
├── modules/            One folder per feature: routes → controller → service
│   ├── auth/  users/  memberships/  projects/  tickets/  insights/
│   └── notifications/  mailer + email templates
└── scripts/seed.ts     First Super Admin
```

**Module rule:** a module may import another module **only through its `*.service.ts`** (or its routes/subscribers). ESLint enforces this (`pnpm lint`).

---

## Production build

```sh
# from Application/
pnpm build
cd apps/api
NODE_ENV=production node --env-file=/path/to/.env dist/server.js
```

There is also a Docker image (build from `Application/`): `docker build -f apps/api/Dockerfile -t ticketing-api .` It has not been tested yet; see the main plan §14 for the VPS setup.
