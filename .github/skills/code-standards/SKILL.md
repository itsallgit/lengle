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

## What's New feature

- `scripts/whats-new.json` is the source of truth for What's New release notes
- It is uploaded to `data/whats-new.json` in S3 as part of every deploy (non-prod and prod)
- `WhatsNewView` reads this file at runtime via `readJson()` — no code change needed to update content
- `useWhatsNew` hook (`app/src/hooks/useWhatsNew.ts`) tracks read state in `localStorage` under `lengle_whats_new_read`, compared against `__APP_VERSION__`
- The unread **NEW** badge on the home screen reappears automatically whenever `__APP_VERSION__` changes
- Every release must prepend a new entry to the `releases` array in `scripts/whats-new.json` before closing