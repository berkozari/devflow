#!/usr/bin/env bash
# Shared helpers. Source from other maintenance scripts; do not run directly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
ENV_FILE="$REPO_ROOT/docker/env/local-production.env"
COMPOSE_FILE="$REPO_ROOT/docker/compose.prod-local.yaml"
BACKUP_DIR="$REPO_ROOT/docker/backups"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

preflight() {
  command -v docker >/dev/null 2>&1 || fail 'Docker CLI was not found.'
  [[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" ]] || fail 'Step 2 Compose and local-production.env are required.'
  [[ -f "$REPO_ROOT/.dockerignore" && -f "$REPO_ROOT/docker/.gitignore" ]] || fail 'Ignore files are missing.'
  grep -Fxq 'docker/backups/' "$REPO_ROOT/.dockerignore" || fail 'Apply the Step 3 exclusion patch before creating database backups.'
  grep -Fxq '/backups/' "$REPO_ROOT/docker/.gitignore" || fail 'Apply the Step 3 Git exclusion patch before creating backups.'
  docker compose version >/dev/null 2>&1 || fail 'Docker Compose plugin is unavailable.'
}

# Never source the env file: Compose reads it for variable substitution.
localprod_compose() {
  docker compose --project-name devflow-prod-local --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

check_live_localprod_db() {
  # This must NEVER target the developer/test database or an external database.
  localprod_compose exec -T postgres sh -ec '
    test "$POSTGRES_DB" = "devflow_localprod" || { echo "Unexpected database name" >&2; exit 30; }
    test "$POSTGRES_USER" = "devflow_localprod" || { echo "Unexpected database role" >&2; exit 31; }
    export PGPASSWORD="$POSTGRES_PASSWORD"
    pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null
  ' >/dev/null
}

sha256_file() {
  local path="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{ print $1 }'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{ print $1 }'
  else
    fail 'Neither shasum nor sha256sum is available.'
  fi
}

verify_archive_file() {
  local archive="$1"
  [[ -f "$archive" && -s "$archive" ]] || fail "Missing or empty archive: $archive"
  [[ -f "${archive}.sha256" ]] || fail "Missing checksum: ${archive}.sha256"
  local expected actual
  expected="$(awk 'NR==1 { print $1 }' "${archive}.sha256")"
  [[ "$expected" =~ ^[[:xdigit:]]{64}$ ]] || fail 'Invalid checksum file format.'
  actual="$(sha256_file "$archive")"
  [[ "$expected" == "$actual" ]] || fail 'SHA-256 mismatch. Backup corrupted or modified.'
  # pg_restore --list verifies this is a recognizable PostgreSQL custom archive.
  localprod_compose exec -T postgres pg_restore --list < "$archive" >/dev/null
}
