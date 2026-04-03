#!/bin/bash
set -e

# Required env vars — set these from CDK outputs before running:
#   export BUCKET_NAME=<CDK output BucketName>
: "${BUCKET_NAME:?BUCKET_NAME is required}"

echo "Building React app..."
cd app && npm run build && cd ..

echo "Uploading app to S3 root (excluding data/)..."
aws s3 sync app/dist/ "s3://${BUCKET_NAME}/" \
  --delete \
  --exclude "data/*" \
  --cache-control "public, max-age=31536000, immutable"

# index.html must never be cached
aws s3 cp app/dist/index.html "s3://${BUCKET_NAME}/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "Deploy complete ✅"
echo "Live URL: check cdk-outputs.json for WebsiteUrl"
