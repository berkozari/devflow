#!/usr/bin/env bash
# Deploy a successful main workflow revision to the EXISTING local-production DB.
set -euo pipefail
source "$(dirname "$0")/_ghcr-release-common.sh"
[[ $# -eq 2 ]] || fail 'Usage: deploy-ghcr-local.sh <owner/repo> <40-char-main-commit-sha>'
validate_repo_sha "$1" "$2"
preflight_release
release_compose config --quiet
check_services
printf 'Preparing local-production deployment from GitHub commit: %s\n' "$COMMIT_SHA"
printf 'Checking GHCR availability for API/Web/Migration images...\n'
release_compose pull api web migrate-ghcr

printf 'Taking required backup of existing local-production database...\n'
bash "$REPO_ROOT/docker/scripts/backup-local-production.sh"
# Restore latest backup to an isolated project before migration.
latest="$(ls -1t "$REPO_ROOT"/docker/backups/devflow-localprod-*.dump 2>/dev/null | head -n 1 || true)"
[[ -n "$latest" ]] || fail 'A pre-deployment backup could not be found.'
bash "$REPO_ROOT/docker/scripts/restore-drill.sh" "$latest"

printf 'Running schema migrations from THE SAME published source revision...\n'
release_compose run --rm --no-deps --pull never migrate-ghcr

printf 'Recreating API, then Web, without touching PostgreSQL or Redis...\n'
release_compose up -d --no-deps --force-recreate --wait --wait-timeout 120 --pull never api
release_compose up -d --no-deps --force-recreate --wait --wait-timeout 120 --pull never web
check_http
save_release
printf 'LOCAL DEPLOYMENT PASSED for sha-%s\n' "$COMMIT_SHA"
printf 'NOTE: Prisma migrations change DB schema; image rollback never reverses migrations.\n'
