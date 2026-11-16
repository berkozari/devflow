#!/usr/bin/env python3
"""Install a user-scoped macOS LaunchAgent; no sudo or system modification."""
import argparse
import os
import plistlib
import subprocess
import sys
from pathlib import Path

LABEL = "com.devflow.localprod.backup"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["install", "status", "uninstall"])
    parser.add_argument("--hour", type=int, default=9)
    parser.add_argument("--minute", type=int, default=0)
    args = parser.parse_args()
    if sys.platform != "darwin":
        parser.error("This scheduler requires macOS launchd")
    if not (0 <= args.hour <= 23 and 0 <= args.minute <= 59):
        parser.error("Hour must be 0..23; minute must be 0..59")
    repo = Path(__file__).resolve().parents[2]
    target_script = repo / "docker/scripts/daily-backup-local-production.sh"
    agent = Path.home() / "Library/LaunchAgents" / (LABEL + ".plist")
    logs = Path.home() / "Library/Logs/DevFlow"
    domain = f"gui/{os.getuid()}"

    if args.action == "status":
        subprocess.run(["launchctl", "print", f"{domain}/{LABEL}"], check=False)
        status_file = repo / "docker/backups/.last-backup-success"
        print("Last successful backup:", status_file.read_text().strip() if status_file.is_file() else "none")
        return 0
    if args.action == "uninstall":
        if agent.exists():
            subprocess.run(["launchctl", "bootout", domain, str(agent)], check=False)
            agent.unlink()
            print("Removed LaunchAgent:", agent)
        return 0
    if agent.exists():
        parser.error("LaunchAgent already installed. Use uninstall before reinstalling with a new schedule")
    if not target_script.is_file():
        parser.error("Missing daily backup script in current repository")
    (Path.home() / "Library/LaunchAgents").mkdir(parents=True, exist_ok=True)
    logs.mkdir(parents=True, exist_ok=True)
    payload = {
        "Label": LABEL,
        "ProgramArguments": ["/bin/bash", str(target_script)],
        "WorkingDirectory": str(repo),
        "StartCalendarInterval": {"Hour": args.hour, "Minute": args.minute},
        "RunAtLoad": False,
        "StandardOutPath": str(logs / "backup.log"),
        "StandardErrorPath": str(logs / "backup-error.log"),
        "EnvironmentVariables": {"PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"},
    }
    with agent.open("wb") as file:
        plistlib.dump(payload, file, sort_keys=True)
    agent.chmod(0o644)
    try:
        subprocess.run(["launchctl", "bootstrap", domain, str(agent)], check=True)
    except subprocess.CalledProcessError:
        agent.unlink(missing_ok=True)
        raise
    print(f"Installed daily backup at {args.hour:02}:{args.minute:02} (local Mac time): {agent}")
    print("Run one manual backup now and check encrypted snapshot before relying on scheduling.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
