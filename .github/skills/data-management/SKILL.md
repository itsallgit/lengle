---
description: Use when backing up, restoring, deleting, or syncing Lengle game data between environments.
---

# Data Management

## Standard commands

- Backup: `bash scripts/backup-data.sh {prod|nonprod}`
- Restore: `bash scripts/restore-data.sh backups/<timestamp> {prod|nonprod}`
- Delete: `bash scripts/delete-data.sh {prod|nonprod}`
- Sync prod to non-prod: `bash scripts/sync-data-to-nonprod.sh`

On Windows, if a chat execution context is PowerShell-only, invoke Git Bash explicitly:

- `& "C:\Program Files\Git\bin\bash.exe" -lc "cd /c/Users/Troy/Repositories/lengle && bash scripts/backup-data.sh prod"`

The scripts auto-resolve AWS auth by checking, in order:

1. `AWS_PROFILE`
2. `LENGLE_AWS_PROFILE`
3. local AWS profile named `lengle`
4. local AWS `default` profile

If credentials are expired, scripts attempt `aws sso login --profile <resolved-profile>` before failing.

## Safety rules

- Always back up prod before prod deploys, restores, or deletes
- Never delete data without explicit confirmation from the user
- Confirm that at least one backup exists before deleting data
- Syncing prod to non-prod should mirror the `data/` prefix, including deletions

## Backup retention

- Backups are committed under `backups/`
- Cleanup is manual and user-directed
- When cleaning up, list backup dates and sizes before any deletion