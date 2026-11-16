#!/usr/bin/env python3
"""Conservative pruning of old local .dump files, never of encrypted snapshots.

Must only be invoked after a new verified encrypted off-filesystem snapshot exists.
Keeps at least N recent archives and refuses deletion unless the matching encrypted
snapshot and its checksums can be verified.
"""
import argparse
import hashlib
import re
import sys
import time
from pathlib import Path

PATTERN = re.compile(r"devflow-localprod-\d{8}T\d{6}Z-\d+\.dump$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def matches_manifest(path: Path) -> bool:
    manifest = Path(str(path) + ".sha256")
    if not path.is_file() or not manifest.is_file():
        return False
    line = manifest.read_text(encoding="ascii").strip().split()
    return len(line) == 2 and line[1] == path.name and line[0] == sha256(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup-dir", type=Path, required=True)
    parser.add_argument("--encrypted-dest", type=Path, required=True)
    parser.add_argument("--keep", type=int, default=7)
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args()
    if args.keep < 7 or args.days < 7:
        parser.error("Safety policy requires at least 7 snapshots and 7 days")
    backup_dir, dest = args.backup_dir.resolve(), args.encrypted_dest.resolve()
    if not backup_dir.is_dir() or not dest.is_dir() or backup_dir == dest:
        parser.error("Backup directory and external encrypted destination must exist separately")
    archives = sorted(
        (p for p in backup_dir.iterdir() if p.is_file() and PATTERN.fullmatch(p.name)),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    cutoff = time.time() - args.days * 86400
    deleted = 0
    for archive in archives[args.keep:]:
        if archive.stat().st_mtime >= cutoff:
            continue
        external = dest / (archive.name + ".encrypted")
        encrypted_dump = external / (archive.name + ".age")
        encrypted_env = external / "local-production.env.age"
        if not external.is_dir() or not matches_manifest(encrypted_dump) or not matches_manifest(encrypted_env):
            print(f"RETAINED (encrypted snapshot not verifiable): {archive.name}", file=sys.stderr)
            continue
        if not matches_manifest(archive):
            print(f"RETAINED (local checksum mismatch): {archive.name}", file=sys.stderr)
            continue
        archive.unlink()
        Path(str(archive) + ".sha256").unlink()
        deleted += 1
        print(f"Pruned: {archive.name}")
    print(f"Retention: {len(archives)} snapshot(s) before pruning, deleted {deleted}, kept at least {min(len(archives), args.keep)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
