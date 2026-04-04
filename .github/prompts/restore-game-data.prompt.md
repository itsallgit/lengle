---
description: "Restore Lengle game data from a local backup to S3"
agent: agent
---

Use this prompt to restore game data from a previously created backup.

## Steps

1. Confirm the `BUCKET_NAME` environment variable is set — run `echo $BUCKET_NAME`. If empty, tell the user to run `export BUCKET_NAME=<value from cdk-outputs.json>` and stop.
2. List available backups — run `ls backups/` and display the results with timestamps. If no backups exist, stop and tell the user to create one with the `backup-game-data` prompt first.
3. Ask the user which backup to restore, or default to the most recent one.
4. Run `bash scripts/restore-data.sh backups/<chosen-backup>` to sync the backup to S3
5. Verify the restore — run `aws s3 ls s3://${BUCKET_NAME}/data/ --recursive` and confirm files are present
6. Report success: game data from `backups/<chosen-backup>` is now live on S3
