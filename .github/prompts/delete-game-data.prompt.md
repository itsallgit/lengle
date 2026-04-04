---
description: "Delete all Lengle game data from S3 — use after backing up and before a player rename or data reset"
agent: agent
---

Use this prompt to wipe all game data from S3. **Always run backup-game-data first.**

## Steps

1. Confirm a recent backup exists — run `ls backups/` and verify at least one backup directory is present. If `backups/` is empty or missing, stop and tell the user to run the `backup-game-data` prompt first.
2. Confirm the `BUCKET_NAME` environment variable is set — run `echo $BUCKET_NAME`. If empty, tell the user to run `export BUCKET_NAME=<value from cdk-outputs.json>` and stop.
3. Run `bash scripts/delete-data.sh` to remove all objects under `s3://${BUCKET_NAME}/data/`
4. Verify deletion — run `aws s3 ls s3://${BUCKET_NAME}/data/` and confirm no objects are returned
5. Report success: all game data has been deleted. Remind the user that the data can be restored at any time using the `restore-game-data` prompt.
