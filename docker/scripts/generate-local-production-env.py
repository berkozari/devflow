#!/usr/bin/env python3
"""Create a one-time, ignored local-production Compose environment file.

Run from any directory. Never overwrites an existing file or prints secrets.
"""
from __future__ import annotations

import os
import secrets
import stat
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "env" / "local-production.env.example"
TARGET = ROOT / "env" / "local-production.env"
KEYS = (
    "LOCAL_PROD_DB_PASSWORD",
    "LOCAL_PROD_REDIS_PASSWORD",
    "LOCAL_PROD_JWT_SECRET",
    "LOCAL_PROD_CSRF_SECRET",
)


def main() -> None:
    contents = EXAMPLE.read_text(encoding="utf-8")
    for key in KEYS:
        old = f"{key}=REPLACE_ME"
        if contents.count(old) != 1:
            raise SystemExit(f"Example does not contain exactly one {key} placeholder")
        contents = contents.replace(old, f"{key}={secrets.token_hex(32)}")

    # Atomic, exclusive create, mode 0600 on POSIX. No accidental overwrite.
    fd = os.open(str(TARGET), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        os.fchmod(fd, stat.S_IRUSR | stat.S_IWUSR)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(contents)
    except BaseException:
        TARGET.unlink(missing_ok=True)
        raise
    print(f"Created {TARGET} (permissions 0600; secrets not displayed)")


if __name__ == "__main__":
    main()
