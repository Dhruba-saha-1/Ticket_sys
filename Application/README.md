# Ticketing

Monorepo for the ticketing platform.

- Architecture: [`../Architecture/Plan/revised_plan.md`](../Architecture/Plan/revised_plan.md)
- Test plan: [`../Architecture/Plan/test_plan.md`](../Architecture/Plan/test_plan.md)

| Folder | What | Status | Guide |
|---|---|---|---|
| `apps/api` | Node.js + Express + MongoDB API | Phase 1 done (auth) | [apps/api/README.md](apps/api/README.md) |
| `apps/web` | Next.js web app | Placeholder pages only | [apps/web/README.md](apps/web/README.md) |
| `apps/mobile` | React Native (Expo) app | Not started (post-v1) | [apps/mobile/README.md](apps/mobile/README.md) |
| `packages/shared` | Enums, types, Zod schemas, permissions, error codes | Used by API and web | — |
| `packages/api-client` | Typed HTTP client for web + mobile | Auth and `/me` endpoints | — |

---

## 1. Prerequisites

You need **Node.js 20.6 or newer**, **pnpm 9**, and (recommended) **Docker** for the local database and mail server.

### 1.1 Node.js and npm

npm is installed automatically with Node.js. You do not install npm separately.

**macOS / Linux (recommended: nvm)**

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart the terminal, then:
nvm install 22
nvm use 22
```

**macOS (Homebrew)**

```sh
brew install node@22
```

**Windows**

Download the LTS installer from <https://nodejs.org>, or use [nvm-windows](https://github.com/coreybutler/nvm-windows).

Check it worked:

```sh
node -v    # v20.6.0 or newer
npm -v
```

### 1.2 pnpm

This repo uses **pnpm workspaces**, not npm. Do **not** run `npm install` in this repo: npm does not understand the `workspace:*` links between packages and the install will fail.

The easiest way to get the right pnpm version is Corepack, which ships with Node:

```sh
corepack enable
pnpm -v    # should print 9.x
```

If `corepack enable` fails with a permission error, either run it with `sudo`, or install pnpm with npm instead:

```sh
npm install -g pnpm@9.12.0
```

### 1.3 Docker (for MongoDB and Mailpit)

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/). The repo's `docker-compose.yml` starts:

| Service | Port | What |
|---|---|---|
| `mongo` | 27017 | Local MongoDB |
| `mailpit` | 1025 (SMTP), 8025 (web UI) | Catches every email the API sends, so nothing goes to real inboxes |

**Without Docker:**

- **MongoDB:** use a free [MongoDB Atlas M0](https://www.mongodb.com/atlas) cluster and put its connection string in `MONGODB_URI`. On macOS you can also run `brew tap mongodb/brew && brew install mongodb-community`.
- **Mailpit:** run `brew install mailpit && mailpit` (macOS), or download a binary from <https://mailpit.axllent.org>.

---

## 2. First-time setup

All commands run from this `Application/` folder unless noted.

```sh
# 1. Install all dependencies for every app and package
pnpm install

# 2. Create your local environment file
cp .env.example .env
```

Open `.env` and set at least:

| Variable | What to put |
|---|---|
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two **different** random strings, 32+ characters. Generate with `openssl rand -base64 48`. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Login for the first Super Admin (password 8+ characters) |

The other defaults work with the Docker services. The full variable list is in [apps/api/README.md](apps/api/README.md#environment-variables).

```sh
# 3. Start MongoDB and Mailpit
docker compose up -d mongo mailpit

# 4. Build the shared packages once (the API and web import their compiled output)
pnpm build

# 5. Create the first Super Admin (does nothing if users already exist)
pnpm seed
```

---

## 3. Running the project

### Everything at once

```sh
pnpm dev
```

This runs every app's `dev` script in parallel through Turborepo:

| App | URL |
|---|---|
| API | <http://localhost:4000/api/v1/health> |
| Web | <http://localhost:3000> |
| Mailpit inbox | <http://localhost:8025> |

The shared packages also rebuild automatically when you edit them. Stop everything with `Ctrl+C`.

### One app at a time

Use `--filter` with the package name:

```sh
pnpm --filter @ticketing/api dev     # API only
pnpm --filter @ticketing/web dev     # Web only
```

Each app's own steps are in its guide: [API](apps/api/README.md) · [Web](apps/web/README.md) · [Mobile](apps/mobile/README.md).

### Quick check that the API works

After `pnpm seed` and `pnpm --filter @ticketing/api dev`:

```sh
curl http://localhost:4000/api/v1/health
# {"status":"ok"}

curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<BOOTSTRAP_ADMIN_EMAIL>","password":"<BOOTSTRAP_ADMIN_PASSWORD>"}'
# {"accessToken":"...","user":{...}}
```

---

## 4. Common commands

Run from `Application/`.

| Command | What it does |
|---|---|
| `pnpm install` | Install or update dependencies for every package |
| `pnpm dev` | Run all apps in watch mode |
| `pnpm build` | Build every package and app |
| `pnpm lint` | ESLint across the repo, including the API module-boundary rule |
| `pnpm typecheck` | TypeScript checks for every package |
| `pnpm test` | All tests (no Docker needed; the API tests use an in-memory MongoDB) |
| `pnpm seed` | Create the first Super Admin from `BOOTSTRAP_ADMIN_*` |
| `pnpm --filter <name> <script>` | Run one package's script, e.g. `pnpm --filter @ticketing/api test` |
| `pnpm --filter <name> add <dep>` | Add a dependency to one package, e.g. `pnpm --filter @ticketing/api add dayjs` |
| `docker compose up -d mongo mailpit` | Start the local database and mail catcher |
| `docker compose down` | Stop them (data is kept in the `mongo-data` volume) |

CI (`../.github/workflows/ci.yml`) runs `lint`, `typecheck` and `test` on every pull request.

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails with `Unsupported URL Type "workspace:"` | Use `pnpm install`, not npm (see 1.2). |
| `pnpm: command not found` | Run `corepack enable`, or `npm install -g pnpm@9.12.0`. |
| `turbo` says `Unable to find package manager binary` | pnpm is not on your `PATH`. Run `corepack enable` and open a new terminal. |
| API exits with `Invalid environment configuration` | A variable in `.env` is missing or invalid; the message names it. JWT secrets must be 32+ characters. |
| API fails with `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running: `docker compose up -d mongo`. |
| Logs show `Mail delivery failed, retrying` | Mailpit is not running: `docker compose up -d mailpit`. Requests still succeed; only the email is lost. |
| `Cannot find module '@ticketing/shared'` | Build the shared packages: `pnpm build`. |
| `EADDRINUSE` on port 4000 or 3000 | Something else is using the port. Stop it, or change `PORT` in `.env` (API). |
| `argon2` install or build errors | Use Node 20 or 22 LTS. Delete `node_modules` and run `pnpm install` again. |
| Too many `429` responses while testing login | The login rate limit is 10 attempts per 15 minutes per IP. Restart the API to reset it, or set `RATE_LIMIT_ENABLED=false` in `.env` (local only). |
