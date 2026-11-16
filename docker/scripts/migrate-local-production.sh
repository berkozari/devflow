#!/usr/bin/env bash
# Explicit production-like migration with mandatory pre-migration backup.
set -euo pipefail
source "$(dirname "$0")/_localprod-common.sh"
[[ $# -eq 1 && "$1" == '--apply' ]] || fail 'To intentionally migrate local-production: migrate-local-production.sh --apply'
preflight
check_live_localprod_db
printf 'Creating mandatory pre-migration backup...\n'
"$REPO_ROOT/docker/scripts/backup-local-production.sh"
printf '\nBackups are under docker/backups/. Confirm the latest backup exists.\n'
# Require a successful full restore drill of the newest archive, not just archive listing.
latest="$(ls -1t "$BACKUP_DIR"/devflow-localprod-*.dump 2>/dev/null | head -n 1 || true)"
[[ -n "$latest" ]] || fail 'No local-production backup archive exists.'
"$REPO_ROOT/docker/scripts/restore-drill.sh" "$latest"
printf '\nApplying pending Prisma migrations to the isolated local-production database...\n'
localprod_compose run --rm --build migrate
printf 'Prisma migrate deploy completed. Verify the app and health checks before continuing.\n'
