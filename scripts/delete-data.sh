#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
ENVIRONMENT="${1:-}"

source "${SCRIPT_DIR}/aws-auth.sh"
ensure_aws_auth

if [ -z "${ENVIRONMENT}" ]; then
	echo "Usage: bash scripts/delete-data.sh <prod|nonprod>"
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
		echo "Usage: bash scripts/delete-data.sh <prod|nonprod>"
		exit 1
		;;
esac

if [ ! -d "${ROOT_DIR}/backups" ] || [ -z "$(find "${ROOT_DIR}/backups" -mindepth 1 -maxdepth 1 -type d -print -quit)" ]; then
	echo "Refusing to delete data without at least one backup folder in backups/."
	exit 1
fi

echo "Deleting all objects under s3://${BUCKET_NAME}/data/ (${ENVIRONMENT}) ..."
aws s3 rm "s3://${BUCKET_NAME}/data/" --recursive

echo ""
echo "Data deleted."
echo "S3 path s3://${BUCKET_NAME}/data/ is now empty."
