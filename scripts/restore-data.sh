#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
BACKUP_DIR_INPUT="${1:-}"
ENVIRONMENT="${2:-prod}"

source "${SCRIPT_DIR}/aws-auth.sh"
ensure_aws_auth

if [ -z "${BACKUP_DIR_INPUT}" ]; then
  echo "Usage: bash scripts/restore-data.sh <backup-dir> [prod|nonprod]"
  exit 1
fi

resolve_output() {
  local key="$1"

  node -e "const fs=require('fs');const path=require('path');const root=process.argv[1];const outputKey=process.argv[2];const file=path.join(root,'cdk-outputs.json');const outputs=JSON.parse(fs.readFileSync(file,'utf8'));const stack=outputs[Object.keys(outputs)[0]]||{};const value=stack[outputKey];if(!value){console.error('Missing CDK output: '+outputKey);process.exit(1);}process.stdout.write(String(value));" "${ROOT_DIR}" "$key"
}

case "${ENVIRONMENT}" in
  prod)
    BUCKET_NAME=$(resolve_output "BucketName")
    ;;
  nonprod)
    BUCKET_NAME=$(resolve_output "NonProdBucketName")
    ;;
  *)
    echo "Usage: bash scripts/restore-data.sh <backup-dir> [prod|nonprod]"
    exit 1
    ;;
esac

if [[ "${BACKUP_DIR_INPUT}" = /* || "${BACKUP_DIR_INPUT}" =~ ^[A-Za-z]:[/\\] ]]; then
  BACKUP_DIR="${BACKUP_DIR_INPUT}"
else
  BACKUP_DIR="${ROOT_DIR}/${BACKUP_DIR_INPUT}"
fi

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "Error: backup directory '${BACKUP_DIR_INPUT}' does not exist"
  exit 1
fi

echo "Restoring ${BACKUP_DIR}/ -> s3://${BUCKET_NAME}/data/ (${ENVIRONMENT}) ..."
aws s3 sync "${BACKUP_DIR}/" "s3://${BUCKET_NAME}/data/"

echo ""
echo "Restore complete."
echo "Data from ${BACKUP_DIR}/ is now live at s3://${BUCKET_NAME}/data/"
