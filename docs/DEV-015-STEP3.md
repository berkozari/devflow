# DEV-015 · Step 3 — Production migrations & PostgreSQL backup / restore (local-only)

This package is **exclusively for the already-running `devflow-prod-local` Compose project** from Step 2. It is not a public-production backup system. Existing development and Vitest/E2E databases are **not** backup or restore targets.

## What the package does

- Creates a **logical, transaction-consistent custom-format `pg_dump`** of `devflow_localprod` into an ignored, restricted `docker/backups/` directory.
- Writes a SHA-256 checksum alongside the `.dump` file and validates PostgreSQL archive metadata.
- Performs a **real `pg_restore` into a fresh, disposable Compose project** with its own PostgreSQL volume. After verifying application tables and completed Prisma migrations, it destroys **only that uniquely named disposable project and volume**.
- Exposes an **explicit, backup-first** migration command. Production-style migration always uses `prisma migrate deploy` from the existing Step-2 `migrate` service.
- Adds `.gitignore` / `.dockerignore` exclusions to prevent sensitive backups from being committed or copied into Docker image layers.

## 0 · Before starting

Ensure Step 2 worked: registration/login succeeds at http://localhost:8080 and `docker compose ... ps` shows healthy services. **DO NOT** use `docker compose down -v` for your local-production project.

These scripts deliberately refuse to operate if database/user are not exactly `devflow_localprod`, if the PostgreSQL service isn't running, or if the backup ignore patch hasn't been applied. They don't need PostgreSQL CLI installed on macOS.

## 1 · Install the package

From the root of the DevFlow monorepo:

```bash
unzip -n ~/Downloads/devflow-dev015-step3-backup-migrations.zip -d .
git apply --check docker/patches/step3-backup-exclusions.patch
git apply docker/patches/step3-backup-exclusions.patch
```

If `git apply --check` fails, **stop**. Compare current `.dockerignore` and `docker/.gitignore` with the patch; do not force a patch. Do not create backups inside the project until `.dockerignore` is correct.

Check:

```bash
grep -F 'docker/backups/' .dockerignore
grep -F '/backups/' docker/.gitignore
```

## 2 · Create your first backup

```bash
bash docker/scripts/backup-local-production.sh
```

Expected output contains `Backup created: .../docker/backups/devflow-localprod-YYYYMMDD...dump` and its `.sha256` manifest. Credentials and application rows are never printed. **Keep that dump private: it contains user/password hashes, tokens, and application data**. The script uses restrictive permissions (`0700` directory, `0600` files), but **does not encrypt archives**.

Confirm Git ignores it:

```bash
git status --short --ignored docker/backups
```

## 3 · Validate and restore the backup without touching live data

Copy the exact backup filename from the output, then run:

```bash
bash docker/scripts/verify-backup.sh docker/backups/devflow-localprod-YYYYMMDDTHHMMSSZ-NNNNN.dump
bash docker/scripts/restore-drill.sh docker/backups/devflow-localprod-YYYYMMDDTHHMMSSZ-NNNNN.dump
```

The second command will:

1. Check the SHA-256 checksum and PostgreSQL archive format.
2. Create a **separate** temporary Compose project named `devflow-restore-*` and a fresh PostgreSQL data volume.
3. Import all schema/data, failing on the first restore error.
4. Verify restored public tables and the `_prisma_migrations` history.
5. Remove **only** the temporary project and its volume, even if the drill fails.

Expected success line: `RESTORE DRILL PASSED`. If anything fails, **do not run migrations**; inspect the error first.

## 4 · Apply pending Prisma migrations safely

Only after the backup / restore drill succeeds and you have reviewed migration SQL:

```bash
bash docker/scripts/migrate-local-production.sh --apply
```

This creates another pre-migration backup, performs a restore drill, and invokes the **already defined** Compose maintenance job:

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml run --rm --build migrate
```

The migration command must remain `prisma migrate deploy`; **never** use `migrate dev`, `migrate reset`, or `db push` against local-production. Schema migrations should be backward-compatible with the running API. Prisma's migrate deploy is not a general schema-drift detector or an automatic rollback mechanism.

Afterwards check the app (`http://localhost:8080`) and a login/logout cycle. Previous application images may not be compatible with newly deployed schemas; **application image rollback does not roll back migrations**.

## 5 · Backup strategy still to operationalize

The present package provides manual backups and a **tested recovery procedure**, not the finished unattended backup policy. Before marking the entire backup acceptance criterion as closed, configure and verify:

- **Scheduling:** daily backup using macOS `launchd` (or a CI-safe scheduler against an accessible host), with alerting on failure. A laptop may sleep or be offline, so success monitoring matters.
- **Retention:** keep at least the last seven validated daily snapshots. Do not auto-delete the only surviving backup.
- **Off-machine encrypted copy:** e.g. `age` encryption with a key stored separately and an encrypted destination outside the Mac/Docker host. Never commit `.dump` or private keys.
- **Recovery objective:** establish recovery-point objective (RPO) and recovery-time objective (RTO); daily dumps alone can lose up to one day's changes.
- **Restore drills:** test on an isolated database on a schedule, and retain audit evidence of success.

**Do not** consider a backup fully verified solely because `pg_dump` exited successfully; successful restore is the strongest operational check.

## Limits / known assumptions

- The generator from Step 2 creates `LOCAL_PROD_DB_USER=devflow_localprod` and `LOCAL_PROD_DB_NAME=devflow_localprod`; scripts refuse other values intentionally. If you customized those values, request a reviewed update rather than relaxing safeguards.
- PostgreSQL server version is 17 as pinned in Step 2, so tools inside that container match its server version.
- Backup is a consistent logical snapshot, not a complete backup of PostgreSQL users/roles, global objects, Redis content, or Docker secret keys. Keep `docker/env/local-production.env` backed up separately **and encrypted**, or restores may not be able to reconnect.
- The optional restore drill deletes **only its own ephemeral isolated volume**. `devflow-prod-local` volumes are never removed.
- This package has had Bash syntax and patch checks, but has **not** been run against your Docker Desktop / live local-production DB.

## Acceptance criteria for Step 3

- [ ] Backup file and checksum created
- [ ] `.dump` and `.sha256` are ignored by Git and Docker builds
- [ ] SHA-256 + `pg_restore --list` verification passes
- [ ] Isolated restore drill passes and leaves existing dev/test/local-prod untouched
- [ ] Prisma migrate deploy succeeds with a mandatory pre-migration backup
- [ ] Login and API still work after the migration check
- [ ] Daily schedule + encrypted off-machine copy + retention and periodic restore are configured before **complete backup strategy** acceptance
