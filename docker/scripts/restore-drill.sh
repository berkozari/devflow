#!/usr/bin/env bash
# Restore to a FRESH, disposable Docker Compose project, NEVER to localprod.
set -euo pipefail
source "$(dirname "$0")/_localprod-common.sh"
[[ $# -eq 1 ]] || fail 'Usage: restore-drill.sh <absolute-or-relative-backup.dump>'
preflight
check_live_localprod_db
archive="$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")"
verify_archive_file "$archive"

# A unique project means this cannot overwrite devflow-prod-local or a prior drill.
drill_project="devflow-restore-$(date -u +%Y%m%d%H%M%S)-${RANDOM}"
[[ "$drill_project" == devflow-restore-* ]] || fail 'Unsafe drill project name.'

drill_compose() {
  docker compose --project-name "$drill_project" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

created=0
cleanup() {
  if [[ "$created" -eq 1 ]]; then
    printf 'Removing only disposable restore project: %s\n' "$drill_project"
    drill_compose down --volumes --remove-orphans >/dev/null || printf 'WARNING: restore project cleanup failed: %s\n' "$drill_project" >&2
  fi
}
trap cleanup EXIT

printf 'Creating isolated, disposable restore database in Compose project: %s\n' "$drill_project"
created=1
drill_compose up -d postgres >/dev/null
ready=0
for _ in $(seq 1 40); do
  if drill_compose exec -T postgres sh -ec '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null
  ' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
[[ "$ready" -eq 1 ]] || fail 'Disposable PostgreSQL did not become ready.'

printf 'Restoring archive in disposable database; live local-production will not be changed...\n'
drill_compose exec -T postgres sh -ec '
  test "$POSTGRES_DB" = "devflow_localprod" || exit 30
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec pg_restore --host=127.0.0.1 --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" --exit-on-error --no-owner --no-acl
' < "$archive"

tables="$(drill_compose exec -T postgres sh -ec '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -XAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname = current_schema();"
' | tr -d '\r\n')"
[[ "$tables" =~ ^[0-9]+$ && "$tables" -gt 0 ]] || fail "Restore contains no application tables: $tables"

migrations="$(drill_compose exec -T postgres sh -ec '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -XAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL;"
' | tr -d '\r\n')"
[[ "$migrations" =~ ^[0-9]+$ && "$migrations" -gt 0 ]] || fail "Restore migration history is missing: $migrations"

printf 'RESTORE DRILL PASSED. Public-schema tables: %s; completed Prisma migrations: %s\n' "$tables" "$migrations"
printf 'Disposable project is automatically removed; original local-production database was not modified.\n'
