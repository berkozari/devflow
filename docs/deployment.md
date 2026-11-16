# DevFlow Deployment Guide

> **Status:** Configuration review / verification guide. The repository contains a **local-production** Docker Compose stack and GHCR publishing workflow. It does **not** establish that a public deployment exists. This document is based on the configuration supplied for DEV-016.

## Deployment model

- **Web:** React/Vite assets compiled in a Node.js 24 builder and served by `nginx/nginx-unprivileged` on container port **8080**.
- **API:** Express/TypeScript compiled in a Node.js 24 builder, served as an unprivileged `node` user on port **3000**.
- **Database:** PostgreSQL 17, persisted in the `postgres_data` named volume.
- **Cache / rate limiting:** Redis 7, password-protected in the local-production stack, with no public port mapping.
- **Migrations:** Prisma 7 migrations run as a dedicated one-off job, not automatically at API startup.
- **CI:** API, web, and Playwright E2E test workflows. A separate Docker image workflow builds on PRs and publishes API, web, and migration images to GHCR for `main` after the reused CI workflows succeed.

### Boundaries

`docker/compose.prod-local.yaml` is **only for local production verification**, not for an internet-facing deployment. Its web port binds to `127.0.0.1:8080`, API and data are isolated on Compose networks, and `LOCAL_PRODUCTION_HTTP=true` intentionally disables the API refresh cookie's `Secure` attribute. Do not expose this stack publicly or reuse that HTTP override in a public environment.

The public demo will require a **separate, HTTPS-enabled production topology** with secure cookies and appropriate proxy/client origin settings. Do not assume that GHCR publishing automatically deploys images to a server.

## Required source files

Before building, check that the actual repository contains these files (not all were included in the review archive):

- `pnpm-lock.yaml` — needed for `pnpm install --frozen-lockfile`.
- `apps/api/prisma/migrations/` — needed for `prisma migrate deploy` (or the actual committed migrations directory defined in `prisma.config.ts`).
- `apps/web/nginx.local.conf` — explicitly copied by `apps/web/Dockerfile`; the reviewed archive did **not** contain it.
- `docker/env/local-production.env` (or your explicitly chosen equivalent) — a **private**, gitignored local-production environment file. It must not be archived or committed.

The API Dockerfile assumes a **monorepo-root Docker build context**. A local `apps/api`-only build context is not equivalent.

## Local-production configuration

Use a private environment file for variable interpolation. The local Compose file requires at least the following values:

| Variable | Purpose |
| --- | --- |
| `LOCAL_PROD_DB_USER` | PostgreSQL user |
| `LOCAL_PROD_DB_PASSWORD` | PostgreSQL password |
| `LOCAL_PROD_DB_NAME` | PostgreSQL database name |
| `LOCAL_PROD_REDIS_PASSWORD` | Redis password |
| `LOCAL_PROD_JWT_SECRET` | JWT signing secret (generate randomly; 32+ characters) |
| `LOCAL_PROD_CSRF_SECRET` | CSRF secret (generate randomly; 32+ characters) |

Treat this environment file as a secret. Use randomly generated, independent JWT and CSRF secrets. Do not reuse the example `.env.example` values in a public deployment. Avoid special URL-reserved characters in database/Redis passwords unless correctly URL-encoded in generated connection strings.

## Local-production build and smoke test

Run from the monorepo root. These commands are **reviewed instructions, not commands tested in the assistant's environment**. Make sure Docker and Docker Compose are installed and your private environment file exists first.

```bash
# Check required non-secret source inputs.
test -f pnpm-lock.yaml
test -f apps/web/nginx.local.conf
test -d apps/api/prisma/migrations

# Inspect Compose interpolation without printing the output publicly:
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml config --quiet

# Build the API, Web and migration images using the repository root context.
docker build -f apps/api/Dockerfile -t devflow-api:dev015 .
docker build -f apps/web/Dockerfile -t devflow-web:dev015 .

# Start only data dependencies.
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml up -d postgres redis

# Run the committed migrations (the maintenance profile enables the job).
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml --profile maintenance \
  run --rm migrate

# Start the application.
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml up -d api web

# Check service state and the local homepage.
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml ps
curl --fail --silent --show-error http://127.0.0.1:8080/
```

**Important:** If the migration job is run with the builder-stage image in `compose.prod-local.yaml`, that image has to be built locally; Compose's build definition supports this. Production migrations are potentially destructive; use appropriate database backups and review migrations before deploying them against non-test data.

The local reverse proxy must forward `/api/v1/` to `api:3000` and serve the SPA with history fallback. Verify those rules in `apps/web/nginx.local.conf`; the exact config was not supplied for review. The web Dockerfile bakes `VITE_API_BASE_URL=/api/v1` into assets by default.

## GHCR image path

`docker/compose.ghcr-local.yaml` is an image override for the local-production stack. It requires these image variables:

- `DEVFLOW_API_IMAGE`
- `DEVFLOW_WEB_IMAGE`
- `DEVFLOW_MIGRATE_IMAGE`

The publishing workflow uses image names of the form `ghcr.io/<lowercase-owner-repo>-api`, `-web`, and `-migrate`, tagged `sha-<commit-sha>`. Confirm the GitHub Actions job succeeded and that the registry images exist and are readable before using them. The override is still **local**, not a public deployment.

The workflow publishes images after CI on `main` but does not automatically apply migrations or deploy to a VPS/PaaS. Do not describe this as fully automated CD.

## Production readiness checklist

- [ ] Select a public hosting topology and configure valid HTTPS certificates.
- [ ] Keep `LOCAL_PRODUCTION_HTTP` unset/false in public production.
- [ ] Set HTTPS-based `CLIENT_URL1` and `CLIENT_URL2` to the actual allowed origins (the current application requires both in production).
- [ ] Ensure secure cookie/CSRF behavior through the actual reverse proxy; validate it in a browser.
- [ ] Provide durable Postgres storage, backup/restore tests and an explicit migration/rollback procedure.
- [ ] Keep Redis private and authenticated; configure availability/restart behavior.
- [ ] Verify secrets, log redaction, network rules and application readiness endpoints.
- [ ] Confirm `trust proxy` against the real, trusted proxy topology rather than enabling it globally.
- [ ] Verify build, database migrations, browser auth flow, E2E tests and health checks against the deployed environment.
- [ ] Define monitoring/alerts and confirm rollback to a known-good immutable image tag.
- [ ] Remove demo credentials/secrets from any published screenshots, documentation or logs.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Web Docker build fails during `COPY apps/web/nginx.local.conf` | File exists in repository and is not excluded by `.dockerignore` |
| `pnpm install --frozen-lockfile` fails | Monorepo-root build context and committed lockfile |
| Migration fails | Correct database target, committed Prisma migrations, Prisma engine/OpenSSL availability |
| API container unhealthy | Database and Redis health, API logs, `GET /api/v1/health/ready` |
| Page loads but API calls fail | Nginx `/api/v1` proxy, baked `VITE_API_BASE_URL`, browser network errors |
| Login/refresh fails | CORS allowed origins, `Secure`/`SameSite` cookies, CSRF token & credentials |
| Local site opens only on this machine | Expected: web port intentionally binds to loopback |

## Documentation status

This guide documents the **provided source configuration**, not the live deployment result. Before calling DEV-016 Demo Environment complete, verify a real public URL and a full user journey on that environment.
