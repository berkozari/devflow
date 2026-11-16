#!/usr/bin/env bash
# Daily policy: archive -> encrypt to a distinct mounted filesystem -> verify -> retain.
# Does not modify the live database or Docker volumes.
set -euo pipefail
umask 077
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
source "$(dirname "$0")/_localprod-common.sh"

CONFIG_FILE="${HOME}/.config/devflow/localprod-backup.conf"
LOCK_DIR="$BACKUP_DIR/.daily-backup.lock"
STAGED_DIR=""
LOCKED=0

cleanup() {
  status=$?
  trap - EXIT
  if [[ -n "$STAGED_DIR" && -d "$STAGED_DIR" ]]; then rm -rf -- "$STAGED_DIR"; fi
  if [[ "$LOCKED" -eq 1 ]]; then
    if [[ "$status" -ne 0 ]]; then
      printf 'FAILED: daily backup on %s (exit %s). Inspect local backup and launchd logs.\n' "$(date -u +%FT%TZ)" "$status" >&2
      printf '%s exit=%s\n' "$(date -u +%FT%TZ)" "$status" > "$BACKUP_DIR/.last-backup-failure" || true
    fi
    rmdir "$LOCK_DIR" || true
  fi
  exit "$status"
}
trap cleanup EXIT

preflight
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  fail "A backup is already running (or a stale lock exists): $LOCK_DIR"
fi
LOCKED=1

# Always make the local backup first, even if the optional external disk is offline.
# On failed external export the job returns non-zero and NEVER prunes local copies.
result="$($REPO_ROOT/docker/scripts/backup-local-production.sh)"
printf '%s\n' "$result"
archive="$(printf '%s\n' "$result" | sed -n 's/^Backup created: //p' | tail -n 1)"
[[ -f "$archive" && "$archive" == "$BACKUP_DIR"/* ]] || fail 'Cannot safely identify new local backup.'
verify_archive_file "$archive"

[[ -f "$CONFIG_FILE" ]] || fail "Missing external encrypted backup configuration: $CONFIG_FILE. Local backup retained: $archive"
# This is a locally-owned trusted configuration file; it must not be downloaded or committed.
# shellcheck disable=SC1090
source "$CONFIG_FILE"
: "${DEVFLOW_BACKUP_DEST:?Set DEVFLOW_BACKUP_DEST in localprod-backup.conf}"
: "${DEVFLOW_BACKUP_RECIPIENT:?Set DEVFLOW_BACKUP_RECIPIENT in localprod-backup.conf}"
command -v age >/dev/null 2>&1 || fail 'age not installed (brew install age). Local backup retained.'
[[ "$DEVFLOW_BACKUP_DEST" = /* && -d "$DEVFLOW_BACKUP_DEST" && -w "$DEVFLOW_BACKUP_DEST" ]] || fail 'Encrypted backup destination must be an existing writable absolute directory on an external/mounted filesystem.'

# Reject a directory inadvertently created on the same filesystem as the local backup.
local_device="$(df -P "$BACKUP_DIR" | awk 'NR==2 {print $1}')"
remote_device="$(df -P "$DEVFLOW_BACKUP_DEST" | awk 'NR==2 {print $1}')"
[[ -n "$local_device" && -n "$remote_device" && "$local_device" != "$remote_device" ]] || fail 'Encrypted backup destination is not on a separate mounted filesystem.'

base="$(basename "$archive")"
remote_final="$DEVFLOW_BACKUP_DEST/${base}.encrypted"
[[ ! -e "$remote_final" ]] || fail "An encrypted snapshot with this name already exists: $remote_final"
STAGED_DIR="$(mktemp -d "$DEVFLOW_BACKUP_DEST/.devflow-stage.XXXXXXXX")"

age -r "$DEVFLOW_BACKUP_RECIPIENT" -o "$STAGED_DIR/${base}.age" "$archive"
age -r "$DEVFLOW_BACKUP_RECIPIENT" -o "$STAGED_DIR/local-production.env.age" "$ENV_FILE"
for encrypted in "$STAGED_DIR/${base}.age" "$STAGED_DIR/local-production.env.age"; do
  [[ -s "$encrypted" ]] || fail "Encryption yielded an empty file: $encrypted"
  file="$(basename "$encrypted")"
  printf '%s  %s\n' "$(sha256_file "$encrypted")" "$file" > "${encrypted}.sha256"
  [[ "$(sha256_file "$encrypted")" == "$(awk 'NR==1 {print $1}' "${encrypted}.sha256")" ]] || fail 'Failed to verify encrypted file checksum.'
  chmod 600 "$encrypted" "${encrypted}.sha256"
done
chmod 700 "$STAGED_DIR"
mv "$STAGED_DIR" "$remote_final"
STAGED_DIR=""
printf 'ENCRYPTED COPY VERIFIED: %s\n' "$remote_final"

# Never prune unless this run created and checksummed a separate encrypted copy.
python3 "$REPO_ROOT/docker/scripts/prune-local-backups.py" \
  --backup-dir "$BACKUP_DIR" --encrypted-dest "$DEVFLOW_BACKUP_DEST" \
  --keep 7 --days 7
printf '%s snapshot=%s remote=%s\n' "$(date -u +%FT%TZ)" "$base" "$remote_final" > "$BACKUP_DIR/.last-backup-success"
rm -f -- "$BACKUP_DIR/.last-backup-failure"
printf 'DAILY BACKUP PASSED. Encrypted copy and local retention policy verified.\n'
