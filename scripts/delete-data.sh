#!/bin/bash
set -e

# Required env var — set before running:
#   export BUCKET_NAME=<CDK output BucketName>
: "${BUCKET_NAME:?BUCKET_NAME is required}"

echo "Deleting all objects under s3://${BUCKET_NAME}/data/ ..."
aws s3 rm "s3://${BUCKET_NAME}/data/" --recursive

echo ""
echo "Data deleted ✅"
echo "S3 path s3://${BUCKET_NAME}/data/ is now empty."
