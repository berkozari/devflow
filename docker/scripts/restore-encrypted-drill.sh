#!/usr/bin/env bash
# Decrypt encrypted/off-filesystem snapshot into ignored private temporary directory
# and perform the same disposable isolated Postgres restore as Step 3.
set -euo pipefail
umask 077
source "$(dirname "$0")/_localprod-common.sh"
[[ $# -eq 2 ]] || fail 'Usage: restore-encrypted-drill.sh <encrypted-snapshot-directory> <age-private-identity-file>'
preflight
command -v age >/dev/null 2>&1 || fail 'age not installed.'
[[ -d "$1" && -f "$2" ]] || fail 'Encrypted snapshot directory and private identity file must exist.'
remote_dir="$(cd "$1" && pwd -P)"
identity="$(cd "$(dirname "$2")" && pwd -P)/$(basename "$2")"
remote_name="$(basename "$remote_dir")"
[[ "$remote_name" =~ ^(devflow-localprod-[0-9]{8}T[0-9]{6}Z-[0-9]+\.dump)\.encrypted$ ]] || fail 'Unrecognized encrypted snapshot directory name.'
base="${BASH_REMATCH[1]}"
localprod_encrypted="$remote_dir/${base}.age"
env_encrypted="$remote_dir/local-production.env.age"
for encrypted in "$localprod_encrypted" "$env_encrypted"; do
  [[ -s "$encrypted" && -f "${encrypted}.sha256" ]] || fail "Missing encrypted file or checksum: $encrypted"
  expected="$(awk 'NR==1 {print $1}' "${encrypted}.sha256")"
  [[ "$expected" =~ ^[[:xdigit:]]{64}$ && "$expected" == "$(sha256_file "$encrypted")" ]] || fail "Encrypted checksum mismatch: $encrypted"
done
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
staging="$(mktemp -d "$BACKUP_DIR/.encrypted-drill.XXXXXXXX")"
trap 'rm -rf -- "$staging"' EXIT
age -d -i "$identity" -o "$staging/$base" "$localprod_encrypted"
age -d -i "$identity" -o "$staging/local-production.env" "$env_encrypted"
[[ -s "$staging/$base" && -s "$staging/local-production.env" ]] || fail 'Decrypted snapshot is empty.'
printf '%s  %s\n' "$(sha256_file "$staging/$base")" "$base" > "$staging/${base}.sha256"
verify_archive_file "$staging/$base"
"$REPO_ROOT/docker/scripts/restore-drill.sh" "$staging/$base"
printf 'ENCRYPTED RESTORE DRILL PASSED. Sensitive temporary files removed.\n'
