---
description: Use when building or deploying the app to production or non-production, or when validating deployment readiness.
---

# Deployment

## Pre-deploy checklist

1. Run `cd app && npm run typecheck`
2. Run `cd app && npm run lint`
3. Confirm the matching env file exists: `app/.env.prod` or `app/.env.nonprod`
4. Resolve the target bucket from `cdk-outputs.json`

## Build and deploy commands

- Non-prod: `cd app && npx vite build --mode nonprod` then `bash scripts/deploy.sh nonprod`
- Prod: `cd app && npx vite build --mode prod` then `bash scripts/deploy.sh prod`
- No environment argument defaults to `nonprod`

## What's New content upload

After every app deploy, upload the release notes to the same bucket:

```
# Resolve bucket name first from cdk-outputs.json, then:
aws s3 cp scripts/whats-new.json s3://{bucket}/data/whats-new.json --profile lengle
```

This applies to both non-prod and prod deploys. The `data/whats-new.json` file in S3 is what the app reads at runtime — it is **not** part of the `app/dist/` build output and must be uploaded separately.

## Validation rules

- Non-prod deploys must verify the website returns HTTP 200
- Production deploys require a git tag on `main` before deployment
- Always back up prod data before production deployment