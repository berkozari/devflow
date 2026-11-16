# DEV-015 Step 5B — GHCR local deployment and application-only rollback

## What changes

1. `.github/workflows/docker-images.yml` now builds **api**, **web**, and **migrate** images. Every image for a main-branch release has the **same full Git commit SHA** tag. PRs only build; do not publish.
2. `apps/api/Dockerfile.migrate` is an isolated Docker image with Prisma CLI and migration files. It does NOT run migrations at build time.
3. `docker/compose.ghcr-local.yaml` overrides only the api/web image names and adds a one-off migrate-ghcr service. PostgreSQL/Redis configurations and existing data volumes stay in the base Compose file.
4. `docker/scripts/deploy-ghcr-local.sh` pulls three version-pinned images, creates and validates a fresh backup, runs migrations with that same commit, deploys api then web and checks liveness/readiness and frontend.
5. `docker/scripts/rollback-ghcr-local.sh` uses a prior API/Web image revision but does not automatically undo database migrations. Use only after confirming backward schema compatibility.
6. `docker/releases/.gitignore` prevents releasing local state accidentally to source control.

## Add files to the feature branch (before merge)

* Copy the updated workflow from the archive **after comparing** to your current `.github/workflows/docker-images.yml`. Do not replace any hand-edited workflow steps without review.
* Add new `apps/api/Dockerfile.migrate`, `docker/compose.ghcr-local.yaml`, `docker/scripts/`, and release `.gitignore`.
* Add the one-line rule `docker/releases/` to your existing ROOT `.dockerignore` by hand rather than replacing that file.
* Do **not** overwrite your existing `docker/.gitignore`, `.env`, `.env.production`, or any secrets.

Confirm before commit:

```bash
cd ~/Sites/my_projects/devflow
git diff --check
docker compose version
# Pure configuration check; does not run migrations or touch data.
export DEVFLOW_API_IMAGE='ghcr.io/example/devflow-api:sha-0000000000000000000000000000000000000000'
export DEVFLOW_WEB_IMAGE='ghcr.io/example/devflow-web:sha-0000000000000000000000000000000000000000'
export DEVFLOW_MIGRATE_IMAGE='ghcr.io/example/devflow-migrate:sha-0000000000000000000000000000000000000000'
docker compose --env-file docker/env/local-production.env -f docker/compose.prod-local.yaml -f docker/compose.ghcr-local.yaml config --quiet
unset DEVFLOW_API_IMAGE DEVFLOW_WEB_IMAGE DEVFLOW_MIGRATE_IMAGE
```

Commit and push feature branch. On the PR expect 3 Docker image build passes. `Publish GHCR` is SKIPPED on PR on purpose. Merge only after tests pass.

## After merging to main: verify GHCR publish

Wait until `DevFlow Docker Images` action for the **main commit** has successful `Publish GHCR - api`, `Publish GHCR - web`, and `Publish GHCR - migrate` jobs. Their names follow:

```
ghcr.io/<owner>/<repo>-api:sha-<full-main-commit-sha>
ghcr.io/<owner>/<repo>-web:sha-<full-main-commit-sha>
ghcr.io/<owner>/<repo>-migrate:sha-<full-main-commit-sha>
```

If packages are private, authenticate your local Docker to GHCR with a token that can read packages (never type tokens into a command line argument or Git history):

```bash
# Example: read a token securely from terminal without echo:
read -s GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
unset GHCR_TOKEN
```

## Local deployment

Start from existing **running local-production PostgreSQL and Redis**, not a new database. From the repository root, using the **full 40-character SHA from successful main run**:

```bash
bash docker/scripts/deploy-ghcr-local.sh OWNER/REPOSITORY FULL_40_CHARACTER_SHA
```

The command automatically pulls all images, runs backup and isolated restore, executes migration, recreates only API and Web (with health wait), then persists the public repo and SHA to `docker/releases/current`. It never runs `down -v` and never exposes PostgreSQL/Redis ports.

Health status:

```bash
bash docker/scripts/health-status-local-production.sh
```

**CAUTION:** Once images are deployed through this override, do not run `docker compose -f docker/compose.prod-local.yaml up -d api web` on its own. That would revert the image declaration to the old `dev015` tags. Instead rerun the deploy script for the same SHA, or use both compose files with the exported `DEVFLOW_*_IMAGE` env variables.

## Application-only rollback

Use a prior successful SHA known to be **compatible with the current migrated schema**:

```bash
bash docker/scripts/rollback-ghcr-local.sh OWNER/REPOSITORY PREVIOUS_40_CHARACTER_SHA --confirm-db-compatible
```

This backs up the database and recreates only API/Web using the previous commit. It NEVER rolls the PostgreSQL schema back. If there is a destructive or incompatible migration, plan a separate restoration to a NEW database and coordinate application recovery; do not blindly run old images.

## Limitations / safety

* Scripts are Mac Bash 3.2 compatible; scripts have static syntax validation but have not been executed against your Docker daemon or GHCR registry.
* Private GHCR package access depends on your GitHub account/package settings.
* The migration image contains monorepo build dependencies, intended ONLY as a short-lived CLI job. It should not be exposed as a service. Only runtime API/Web containers handle requests.
* The version that runs must match the tag actually published by the **main** workflow. PR SHA is not a valid release tag unless it is also the merged main commit.
* Schema migrations are not reversible by switching application images.
* Extra off-machine backup was closed by scope decision, not implemented in this local-only task.
