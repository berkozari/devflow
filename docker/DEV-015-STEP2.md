# DEV-015 / Step 2 — Docker Compose + Environment Separation

This is a **local-production-only** Docker Compose configuration. It is NOT an
internet-facing deployment and intentionally uses plain HTTP on loopback.
Domain, public TLS, monitoring endpoints, backup automation and CI/CD rollout
are separate later steps.

## Scope and safety

- Reuses the **already built** `devflow-api:dev015` and `devflow-web:dev015`
  images from Step 1. The API image MUST be rebuilt after applying the code patch.
- Creates a separate Compose project named `devflow-prod-local` with distinct
  PostgreSQL and Redis containers, private networks and a persistent database
  volume. It does not reuse or stop `devflow-postgres`, `devflow-redis` or
  `devflow-redis-test`.
- Only web is bound to the host, at `127.0.0.1:8080`.
  Database, Redis and API have **no published host ports**.
- `NODE_ENV=production` stays enabled. An explicit `LOCAL_PRODUCTION_HTTP=true`
  flag allows HTTP **only** for `http://localhost:8080` and
  `http://127.0.0.1:8080`, while leaving the production HTTPS requirement in
  place for every other origin. The local refresh cookie remains HTTP-only
  (not `Secure`) because browsers may reject a `Secure` cookie on plain HTTP;
  this exception MUST NOT be enabled for a public deployment.
- The patch also extends `.dockerignore` to exclude the new named secret
  file. **Apply it before rebuilding any image** to avoid baking credentials
  into Docker builder layers via `COPY . .`.
- The API code patch was constructed against a previously shared source
  snapshot. **Always run `git apply --check` first.** If it does not apply,
  do NOT overwrite your actual source files: provide their current versions
  for a precise patch.

## Files

- `docker/compose.prod-local.yaml`: PostgreSQL 17, Redis 7, API, web and an
  opt-in `migrate` maintenance job.
- `docker/env/local-production.env.example`: committed example, no credentials.
- `docker/.gitignore`: ignores actual local-only environment values.
- `docker/scripts/generate-local-production-env.py`: one-time random secrets
  generator, refuses to overwrite existing values.
- `docker/patches/local-production-http.patch`: scoped API environment,
  refresh-cookie, **and `.dockerignore` security** changes; review before applying.
- `docker/DEV-015-STEP2.md`: this document.

## 1 — Extract into the repository root

```bash
cd ~/Sites/my_projects/devflow
unzip -n ~/Downloads/devflow-dev015-step2-compose.zip -d .
```

Use `-n` rather than overwriting other project files; review conflicts.

## 2 — Review and apply the narrow source patch

```bash
git apply --check docker/patches/local-production-http.patch
# Only if the previous command succeeds:
git apply docker/patches/local-production-http.patch

git diff -- .dockerignore apps/api/src/config/env.ts apps/api/src/config/cookie.ts
```

**Important:** Inspect `apps/api/src/config/csrf.ts` as well. If it independently
sets the CSRF session cookie to `secure: true` in `NODE_ENV=production`, then
HTTP registration may still fail; do not blindly weaken the CSRF logic.
Share the current file to adapt that setting only in the approved local mode.

## 3 — Generate stable local-only secrets (never commit)

```bash
python3 docker/scripts/generate-local-production-env.py
chmod 600 docker/env/local-production.env

git check-ignore docker/env/local-production.env
```

You should see `docker/env/local-production.env` as ignored.
The generator does NOT output the passwords. It will refuse to replace them
on a second run. Preserve the file unless intentionally rotating all secrets.

**Credential handling:** Variables are passed as container environment values,
so a user with Docker daemon access can inspect them. This is appropriate to
this controlled local Docker Desktop exercise, not a hardened public secret
management design. Do not paste `docker compose config` without `--quiet` into
chats: its expanded output includes credentials.

## 4 — Rebuild API after applying the patch

The web image does not need rebuilding because Step 1 already compiled it with
`VITE_API_BASE_URL=/api/v1`. The API image must include the new environment code:

```bash
docker build --progress=plain -f apps/api/Dockerfile -t devflow-api:dev015 .
```

## 5 — Validate Compose config without printing secrets

Run all the commands below from the repository root:

```bash
docker compose \
  --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml config --quiet
```

If the shell has any exported `LOCAL_PROD_*` variables, Compose gives them
precedence over the env-file. Unset stale overrides or open a new terminal.
See Docker Compose environment variable precedence.

## 6 — Start isolated data services, then apply initial migration

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml up -d postgres redis

docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml run --rm --build migrate
```

The maintenance profile is disabled for ordinary `up`; explicitly targeting
`migrate` starts that one-off job only when requested. It uses the builder stage
of the API Dockerfile because the minimal runtime image intentionally lacks the
Prisma CLI. Migrations go ONLY to the separate local-production DB.

Production migration backup policy will be implemented in Step 3. For now the
database is new and empty; **do not** point this migration service at existing
production data or execute it against your development/test DB.

## 7 — Launch and smoke-test

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml up -d

docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml ps

curl -i http://127.0.0.1:8080/
curl -i -H 'Origin: http://localhost:8080' \
  http://127.0.0.1:8080/api/v1/auth/csrf-token
```

Both requests should normally return `200 OK`. Open
`http://localhost:8080`, register an isolated test account, log in, refresh
the page, and log out. Do not run destructive E2E suites against this database.

If containers do not start, inspect logs without printing env values:

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml logs --tail=80 api web postgres redis
```

Note: the API's Step-2 healthcheck temporarily calls the existing CSRF GET
endpoint. Step 4 will add dedicated liveness/readiness probes.

## Stop safely, preserving all data

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml down
```

**Never use `down -v`**: that would DELETE the local-production PostgreSQL data
volume. `down` without `-v` preserves the volume. Do not `docker rm` the
existing development/test containers.

## Acceptance criteria for DEV-015 Step 2

- [ ] `git apply --check` and `git apply` succeed (or adjusted for current code)
- [ ] Secrets file exists with restricted permissions and is ignored by Git
- [ ] `.dockerignore` excludes `docker/env/local-production.env` before build
- [ ] API image is rebuilt using the patch
- [ ] `docker compose ... config --quiet` succeeds
- [ ] Migrate job exits with status 0 on isolated database
- [ ] `web`, `api`, `postgres`, `redis` are running / healthy
- [ ] `http://localhost:8080` returns HTTP 200
- [ ] `http://localhost:8080/api/v1/auth/csrf-token` returns HTTP 200
- [ ] Registration/login/refresh/logout work in a browser on the local origin
- [ ] Existing development/test containers are unchanged
- [ ] Database volume survives safe `down` / `up -d`

## Future steps

Step 3: controlled migration/backup/restore, including encrypted off-machine
backups and recovery drills. Step 4: formal health endpoints and monitoring.
Step 5: image publishing and local rollout via GitHub Actions.
