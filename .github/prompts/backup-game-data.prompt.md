---
description: "Back up all Lengle game data from S3 to a local timestamped folder and commit it to git"
agent: agent
---

Use this prompt to back up all game data from S3 before making destructive changes.

## Steps

1. Confirm the `BUCKET_NAME` environment variable is set — run `echo $BUCKET_NAME` and verify it is non-empty. If it is empty, tell the user to run `export BUCKET_NAME=<value from cdk-outputs.json>` and stop.
2. Run `bash scripts/backup-data.sh` — this syncs `s3://${BUCKET_NAME}/data/` to a new timestamped folder under `backups/`
3. Report which folder was created (e.g. `backups/20260404-120000/`)
4. Stage and commit the backup to git:
   ```
   git add backups/
   git commit -m "chore: backup game data $(date +%Y%m%d-%H%M%S)"
   ```
5. Confirm the commit was created and report the commit hash
6. Report success: backup is saved in git and can be restored with `restore-game-data` prompt
