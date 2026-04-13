#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
ENVIRONMENT="${1:-prod}"

source "${SCRIPT_DIR}/aws-auth.sh"
ensure_aws_auth

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
		echo "Usage: bash scripts/backup-data.sh [prod|nonprod]"
		exit 1
		;;
esac

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEST="${ROOT_DIR}/backups/${TIMESTAMP}"

mkdir -p "${DEST}"

echo "Backing up ${ENVIRONMENT} data from s3://${BUCKET_NAME}/data/ ..."
aws s3 sync "s3://${BUCKET_NAME}/data/" "${DEST}/"

echo ""
echo "Backup complete -> ${DEST}/"
echo "Next step: git add backups/ && git commit -m \"backup: game data ${TIMESTAMP}\""
