---
description: Use when working with environment configuration, Vite modes, CDK outputs, bucket names, or generated env files.
---

# Environments

## Environment model

- `prod` uses `BucketName` and `WebsiteUrl`
- `nonprod` uses `NonProdBucketName` and `NonProdWebsiteUrl`
- Both environments share `IdentityPoolId`

## Env files

- `app/.env.prod` is generated for production builds
- `app/.env.nonprod` is generated for non-prod builds
- `app/.env.local` is only for local `npm run dev`
- Generate the build env files with `cd app && npm run env:setup`

## Resolution rules

- Read bucket names and URLs from `cdk-outputs.json`
- Vite mode `prod` loads `.env.prod`
- Vite mode `nonprod` loads `.env.nonprod`
- Most testing should target non-prod unless the user explicitly asks for prod