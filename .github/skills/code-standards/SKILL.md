---
description: Use when designing, writing, or reviewing code in the Lengle repo, including app logic, infrastructure, or implementation plans.
---

# Code Standards

## S3 access rules

- All S3 reads go through `app/src/lib/s3.ts` via `readJson()`
- All S3 writes go through `app/src/lib/s3.ts` via `writeToS3()`
- All S3 list operations go through `app/src/lib/s3.ts` via `listS3Keys()`
- Never use the AWS SDK for reads
- Never import AWS SDK clients directly into components or hooks

## App architecture rules

- Scoring values come from `CONFIG.scoring` in `app/src/lib/config.ts`
- Date and reset logic goes through `app/src/lib/date.ts`
- Player names, IDs, and default emojis are defined in `CONFIG.players`
- Player identity and emoji data are shared via `PlayerContext` in `app/src/App.tsx`
- TypeScript strict mode is required and `any` is not allowed

## Documentation and specs

- Update the relevant spec when implementation architecture changes
- Keep repo guidance in `.github/copilot-instructions.md` lightweight
- Put reusable operational standards in skills instead of duplicating them across agents

## Release versioning

- `app/package.json` must match the active release version
- `__APP_VERSION__` is sourced from the package version via Vite