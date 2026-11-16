# Getting Started with DevFlow

> **Status:** Source-informed local setup guide. The commands and configuration below are based on the repository files supplied for documentation review. A clean-machine installation has **not** been executed as part of this review. Dockerfiles, Compose files, example environment files, and the migrations directory were not included in that review archive; confirm their actual names and availability before publishing this as a fully verified installation procedure.

DevFlow is a pnpm monorepo containing a React/Vite frontend (`apps/web`) and a Node.js/Express API (`apps/api`). The API uses PostgreSQL via Prisma and requires Redis for its current runtime configuration.

## Prerequisites

- **Node.js 24**, matching the version configured in GitHub Actions.
- **pnpm 12.18.0**, as declared in the root `package.json` (`packageManager`). Use Corepack or another approved way to install this exact version.
- A reachable **PostgreSQL** instance. CI uses PostgreSQL 17; the local version has not been independently verified.
- A reachable **Redis** instance. CI uses Redis 7; the application requires `REDIS_URL` at startup.
- A local shell and a Git checkout of the DevFlow repository.

Verify the tools:

```bash
node --version
pnpm --version
```

## 1. Install dependencies

From the monorepo root:

```bash
pnpm install --frozen-lockfile
```

The workspace is defined by `pnpm-workspace.yaml` and covers `apps/*` and `packages/*`. The supplied workspace config explicitly blocks several dependency install scripts through `allowBuilds`; do **not** globally enable install scripts to bypass a warning. Assess script permissions deliberately if package installation fails. The API `postinstall` script is `prisma skills sync || exit 0`; it does **not** replace Prisma Client generation.

## 2. Start local infrastructure

Start PostgreSQL and Redis using the project's actual local services or existing container setup. The review archive did not contain `compose.yaml`, `docker-compose.yml`, or Dockerfiles, so **no verified `docker compose up` command can be supplied here**.

For a local development example only, you may configure:

- PostgreSQL listening on `127.0.0.1:5432` with a **dedicated development database** of your choosing.
- Redis listening on `127.0.0.1:6379` (different from the isolated test Redis port below).

Create these services and credentials yourself; they are not provisioned by `pnpm install`.

## 3. Configure the API environment

The API imports `dotenv/config` or calls `dotenv.config()`. When running through the `@devflow/api` pnpm workspace, configure environment variables in `apps/api/.env` (or provide them via the process environment).

**Example for local development — replace placeholders with your own non-production values:**

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://DEV_USER:DEV_PASSWORD@127.0.0.1:5432/devflow_dev?schema=public
REDIS_URL=redis://127.0.0.1:6379/0
JWT_SECRET=REPLACE_WITH_A_CRYPTOGRAPHICALLY_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CSRF_SECRET=REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CLIENT_URL1=http://127.0.0.1:5173
CLIENT_URL2=http://localhost:5173
REFRESH_TOKEN_EXPIRES_IN_DAYS=7
LOG_LEVEL=debug
```

Generate independent cryptographically random secrets (for example, with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`), and **never commit `.env` files**. The sample URL and database name are illustrative, not values extracted from a local `.env` file.

`src/config/env.ts` also supports optional positive-integer rate limits:

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window, in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | General request limit |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `10` | Authentication request limit |
| `REFRESH_RATE_LIMIT_MAX_REQUESTS` | `20` | Refresh request limit |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | `7` | Refresh cookie lifetime, in days |
| `LOG_LEVEL` | `debug` in development, `info` in production | Logger verbosity |

The API validates `JWT_SECRET` and `CSRF_SECRET` length (minimum 32 characters), `PORT`, environment names, client URLs, rate limits, and the presence of `REDIS_URL` at startup. `LOCAL_PRODUCTION_HTTP` is a special local production reverse-proxy opt-in, **not** a normal development setting and must never be enabled for a public deployment.

## 4. Configure the web environment

The Axios client requires `VITE_API_BASE_URL`. Configure the frontend environment (typically `apps/web/.env.local`) with:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

The value matches the API host you actually use. Choose the browser frontend origin (`localhost` versus `127.0.0.1`) consistently with the API's `CLIENT_URL1` / `CLIENT_URL2` allowlist and cookie behavior.

## 5. Generate the Prisma Client and apply migrations

The supplied `apps/api/prisma.config.ts` points to `prisma/schema.prisma`, the migrations directory `prisma/migrations`, and `DATABASE_URL`.

From the monorepo root:

```bash
pnpm --filter @devflow/api exec prisma generate
pnpm --filter @devflow/api exec prisma migrate deploy
```

**Important:** `migrate deploy` applies existing migrations; it does not create a new migration. The actual `apps/api/prisma/migrations/` files were not present in the review ZIP. Confirm that they are committed and represent the intended schema before running this command against any database. Never run migrations against production without an approved deployment/backup procedure.

## 6. Start the development servers

Use separate terminals from the monorepo root:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

By default, the API uses port **3000**. The CI frontend uses `http://127.0.0.1:5173`; confirm Vite's printed local URL in your shell instead of assuming that port is always available.

Useful local API endpoints from the reviewed project context:

- API root: `http://127.0.0.1:3000/api/v1/`
- Authentication CSRF endpoint: `http://127.0.0.1:3000/api/v1/auth/csrf-token`
- Swagger UI in development: `http://127.0.0.1:3000/api-docs/` (as reported working in the project review)

## 7. Build and run checks

```bash
pnpm --filter @devflow/api typecheck
pnpm --filter @devflow/api build
pnpm --filter @devflow/web typecheck
pnpm --filter @devflow/web test:typecheck
pnpm --filter @devflow/web build
```

Frontend unit/component tests:

```bash
pnpm --filter @devflow/web test:run
pnpm --filter @devflow/web test:coverage
```

API unit/integration tests:

```bash
pnpm --filter @devflow/api test
```

**Do not run API integration tests against your normal development database.** `src/config/database.ts` explicitly refuses to connect in `NODE_ENV=test` unless `DATABASE_URL=TEST_DATABASE_URL` and the target is a local database named **`devflow_test`**. `src/config/redis.ts` similarly requires `REDIS_URL=TEST_REDIS_URL` on local port **6380**. The project CI sets these using isolated PostgreSQL/Redis service containers and supplies `.env.test` values. Follow the actual local Vitest setup before running tests; local test setup and migrations were not included in this ZIP.

For browser E2E in an appropriately isolated setup:

```bash
pnpm --filter @devflow/web exec playwright install --with-deps chromium
pnpm --filter @devflow/web exec playwright test --config playwright.config.ts
```

Do not run E2E against a real personal or production database. The CI uses `E2E_ISOLATED_DB=confirmed` and an isolated `devflow_test` database, plus a separate Redis instance.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| API fails at startup because `JWT_SECRET`, `CSRF_SECRET`, or `REDIS_URL` is missing | API environment file or process environment; minimum secret length |
| Prisma Client import/build fails | Run `pnpm --filter @devflow/api exec prisma generate`; confirm Prisma migration/config paths |
| Database connection fails | `DATABASE_URL`, database existence, credentials and PostgreSQL availability |
| Redis connection or rate limiter fails | Redis server, `REDIS_URL`, and port |
| Browser encounters CORS or cookie issues | Frontend origin, `CLIENT_URL1/2`, `VITE_API_BASE_URL`, HTTPS/SameSite/cookie settings |
| Swagger fails with `ENOENT` | Confirm `apps/api/docs/openapi/openapi.yaml` exists where Swagger configuration expects it |
| Tests refuse the database or Redis URL | Use only the dedicated `devflow_test` database and Redis on `6380`, with matching `TEST_*` variables |
| pnpm reports ignored dependency builds | Review the repository's explicit `allowBuilds` settings; do not indiscriminately permit scripts |

## Documentation and source of truth

- [System architecture](architecture.md)
- [Database design](database.md)
- [Technical decisions](technical-decisions.md)
- `apps/api/docs/openapi/openapi.yaml` — API-local Swagger specification; the review ZIP also contained `docs/openapi/openapi.yaml`, which may not be the runtime source.

Before releasing v1.0.0, execute these instructions in a clean environment and replace unverified assumptions with verified commands.
