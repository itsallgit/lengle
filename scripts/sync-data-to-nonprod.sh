#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)

source "${SCRIPT_DIR}/aws-auth.sh"
ensure_aws_auth

resolve_output() {
  local key="$1"

  node -e "const fs=require('fs');const path=require('path');const root=process.argv[1];const outputKey=process.argv[2];const file=path.join(root,'cdk-outputs.json');const outputs=JSON.parse(fs.readFileSync(file,'utf8'));const stack=outputs[Object.keys(outputs)[0]]||{};const value=stack[outputKey];if(!value){console.error('Missing CDK output: '+outputKey);process.exit(1);}process.stdout.write(String(value));" "${ROOT_DIR}" "$key"
}

PROD_BUCKET_NAME=$(resolve_output "BucketName")
NONPROD_BUCKET_NAME=$(resolve_output "NonProdBucketName")

if [ "${PROD_BUCKET_NAME}" = "${NONPROD_BUCKET_NAME}" ]; then
  echo "Refusing to sync because prod and nonprod bucket names are identical."
  exit 1
fi

echo "Syncing s3://${PROD_BUCKET_NAME}/data/ -> s3://${NONPROD_BUCKET_NAME}/data/ ..."
aws s3 sync "s3://${PROD_BUCKET_NAME}/data/" "s3://${NONPROD_BUCKET_NAME}/data/" --delete

echo "Non-prod data is now aligned with production."