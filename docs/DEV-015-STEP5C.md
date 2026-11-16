# DEV-015 Step 5C — Prisma OpenSSL fix in migration image

Root cause of reported first GHCR local deploy failure: the `node:24-bookworm-slim` migration image lacks OpenSSL and Prisma falls back to OpenSSL 1.1. On arm64 it attempts a `linux-arm64-openssl-1.1.x` schema-engine download during migration, which failed with `getaddrinfo EAI_AGAIN binaries.prisma.sh`.

The included patch changes only `apps/api/Dockerfile.migrate`. It installs Debian Bookworm's `openssl` and `ca-certificates` **before** `pnpm install` and invokes `prisma -v` at image-build time so engine fetch/checks happen in CI/build instead of during a production database migration. The dummy build DATABASE_URL is not a real connection. It does not run migrations during image build.

## Prepare new release (prior release already merged)

```bash
cd ~/Sites/my_projects/devflow
git status --short
# Ensure working tree is clean or consciously preserve changes before switching.
git switch main
git pull --ff-only origin main
git switch -c fix/dev-015-prisma-openssl

# After unzipping the patch ZIP at repo root:
git apply --check docker/patches/step5c-prisma-openssl.patch
git apply docker/patches/step5c-prisma-openssl.patch
git diff --check

docker build -f apps/api/Dockerfile.migrate -t devflow-migrate:openssl-fix .
docker run --rm --network none --entrypoint sh devflow-migrate:openssl-fix -c 'export DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build_only; openssl version; cd /workspace/apps/api && pnpm exec prisma -v'
```

If Docker build fails on an engine download due to unavailable Internet/DNS, diagnose connectivity separately; do not disable checksums and do not attempt migrations against the database.

Commit/push/PR, check API/Web test and all 3 Docker build jobs. Merge after checks pass, then use the **new main SHA** and successful GHCR publish. `deploy-ghcr-local.sh` will do backup/restore check and migration against existing isolated local-production database.

Avoid `docker compose down -v`, `prisma migrate reset`, and manually modifying production data.
