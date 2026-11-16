#!/usr/bin/env bash
# Roll back API/Web images ONLY; do not undo schema migrations or restore DB.
set -euo pipefail
source "$(dirname "$0")/_ghcr-release-common.sh"
[[ $# -eq 3 && "$3" == '--confirm-db-compatible' ]] || fail 'Usage: rollback-ghcr-local.sh <owner/repo> <previous-40-char-sha> --confirm-db-compatible'
validate_repo_sha "$1" "$2"
preflight_release
release_compose config --quiet
check_services
printf 'Application-only rollback to sha-%s (NO DATABASE ROLLBACK).\n' "$COMMIT_SHA"
printf 'Caller confirmed old app version is compatible with current database schema.\n'
release_compose pull api web
printf 'Taking backup before changing running app images...\n'
bash "$REPO_ROOT/docker/scripts/backup-local-production.sh"
release_compose up -d --no-deps --force-recreate --wait --wait-timeout 120 --pull never api
release_compose up -d --no-deps --force-recreate --wait --wait-timeout 120 --pull never web
check_http
save_release
printf 'APPLICATION ROLLBACK PASSED for sha-%s\n' "$COMMIT_SHA"
