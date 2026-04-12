#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
ENVIRONMENT="${1:-nonprod}"

resolve_output() {
  local key="$1"

  node -e "const fs=require('fs');const path=require('path');const root=process.argv[1];const outputKey=process.argv[2];const file=path.join(root,'cdk-outputs.json');const outputs=JSON.parse(fs.readFileSync(file,'utf8'));const stack=outputs[Object.keys(outputs)[0]]||{};const value=stack[outputKey];if(!value){console.error('Missing CDK output: '+outputKey);process.exit(1);}process.stdout.write(String(value));" "${ROOT_DIR}" "$key"
}

case "${ENVIRONMENT}" in
  prod)
    BUCKET_OUTPUT_KEY="BucketName"
    URL_OUTPUT_KEY="WebsiteUrl"
    ;;
  nonprod)
    BUCKET_OUTPUT_KEY="NonProdBucketName"
    URL_OUTPUT_KEY="NonProdWebsiteUrl"
    ;;
  *)
    echo "Usage: bash scripts/deploy.sh [prod|nonprod]"
    exit 1
    ;;
esac

ENV_FILE="${ROOT_DIR}/app/.env.${ENVIRONMENT}"
if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE}. Run 'cd app && npm run env:setup' first."
  exit 1
fi

BUCKET_NAME=$(resolve_output "${BUCKET_OUTPUT_KEY}")
WEBSITE_URL=$(resolve_output "${URL_OUTPUT_KEY}")

echo "Building React app for ${ENVIRONMENT}..."
cd "${ROOT_DIR}/app"
npm run typecheck
npx vite build --mode "${ENVIRONMENT}"
cd "${ROOT_DIR}"

echo "Uploading app to s3://${BUCKET_NAME}/ ..."
aws s3 sync app/dist/ "s3://${BUCKET_NAME}/" \
  --delete \
  --exclude "data/*" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp app/dist/index.html "s3://${BUCKET_NAME}/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "Deploy complete for ${ENVIRONMENT}."
echo "Live URL: ${WEBSITE_URL}"
