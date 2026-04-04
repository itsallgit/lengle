#!/bin/bash
set -e

# Required env var — set before running:
#   export BUCKET_NAME=<CDK output BucketName>
: "${BUCKET_NAME:?BUCKET_NAME is required}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEST="backups/${TIMESTAMP}"

echo "Backing up s3://${BUCKET_NAME}/data/ → ${DEST}/ ..."
aws s3 sync "s3://${BUCKET_NAME}/data/" "${DEST}/"

echo ""
echo "Backup complete ✅  →  ${DEST}/"
echo ""
echo "Next step — commit this backup to git:"
echo "  git add backups/"
echo "  git commit -m \"chore: backup game data ${TIMESTAMP}\""
