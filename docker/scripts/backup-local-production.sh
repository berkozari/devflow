#!/usr/bin/env bash
# Logical PostgreSQL backup of ONLY the local-production Compose database.
set -euo pipefail
source "$(dirname "$0")/_localprod-common.sh"
umask 077
preflight
check_live_localprod_db
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="devflow-localprod-${stamp}-${RANDOM}.dump"
output="$BACKUP_DIR/$name"
[[ ! -e "$output" ]] || fail 'Backup filename already exists.'
tmp="$(mktemp "$BACKUP_DIR/.partial.XXXXXXXXXX")"
trap 'rm -f "$tmp"' EXIT

printf 'Creating consistent PostgreSQL archive from the isolated local-production database...\n'
localprod_compose exec -T postgres sh -ec '
  test "$POSTGRES_DB" = "devflow_localprod" || exit 30
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec pg_dump --host=127.0.0.1 --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" --format=custom --compress=6
' > "$tmp"
[[ "$(wc -c < "$tmp" | tr -d ' ')" -gt 256 ]] || fail 'Backup archive is unexpectedly small.'
localprod_compose exec -T postgres pg_restore --list < "$tmp" >/dev/null
mv "$tmp" "$output"
trap - EXIT
checksum="$(sha256_file "$output")"
printf '%s  %s\n' "$checksum" "$name" > "${output}.sha256"
chmod 600 "$output" "${output}.sha256"
printf 'Backup created: %s\n' "$output"
printf 'Size: %s bytes\n' "$(wc -c < "$output" | tr -d ' ')"
printf 'SHA-256 manifest: %s\n' "${output}.sha256"
printf 'Next: run restore-drill.sh with this backup before relying on it for recovery.\n'
