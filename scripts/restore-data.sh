#!/bin/bash
set -e

# Required env var — set before running:
#   export BUCKET_NAME=<CDK output BucketName>
: "${BUCKET_NAME:?BUCKET_NAME is required}"

# Required arg — path to local backup directory:
#   bash scripts/restore-data.sh backups/20260404-120000
BACKUP_DIR="${1:?Usage: bash scripts/restore-data.sh <backup-dir>}"

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "Error: backup directory '${BACKUP_DIR}' does not exist"
  exit 1
fi

echo "Restoring ${BACKUP_DIR}/ → s3://${BUCKET_NAME}/data/ ..."
aws s3 sync "${BACKUP_DIR}/" "s3://${BUCKET_NAME}/data/"

echo ""
echo "Restore complete ✅"
echo "Data from ${BACKUP_DIR}/ is now live at s3://${BUCKET_NAME}/data/"
