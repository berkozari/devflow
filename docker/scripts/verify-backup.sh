#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_localprod-common.sh"
[[ $# -eq 1 ]] || fail 'Usage: verify-backup.sh <absolute-or-relative-backup.dump>'
preflight
check_live_localprod_db
archive="$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")"
verify_archive_file "$archive"
printf 'Checksum and PostgreSQL archive metadata verified: %s\n' "$archive"
printf 'Note: only a restore drill verifies a full restoration.\n'
