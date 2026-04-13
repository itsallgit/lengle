# Lengle — Copilot Instructions

## Project overview

Lengle is a private family word puzzle game built as a static React + TypeScript + Tailwind app hosted from AWS S3 website buckets. There is no backend API, no database, and no server-side compute. Game data is stored as JSON in S3 and accessed directly from the browser.

Primary implementation references:
- `specs/spec-game-design.md` for behaviour
- `specs/spec-implementation.md` for technical architecture
- `specs/spec-ux-design.md` for visual and interaction rules

## Working model

Use the single-chat orchestrator model by default.

1. Start in `@orchestrator`
2. Describe the task in natural language
3. Let the orchestrator route to the correct domain agent based on git state and plan state
4. Stay in one conversation unless you explicitly need to address a specific agent directly

## Routing summary

- On `main` with no active release branch: new change requests route to Release Agent to create a branch, then Plan Agent
- On `main` with an active release branch: orchestrator asks user whether to add to it or defer
- On `release/vX.Y` or `hotfix/vX.Y.Z`: routes to the appropriate agent based on plan state (Plan → Design → Build → Release)
- On any branch: production deploys, backups, restores, cleanup, and rollback route to Production Agent

## Environment model

- Production uses the `BucketName` and `WebsiteUrl` outputs
- Non-production uses the `NonProdBucketName` and `NonProdWebsiteUrl` outputs
- Both environments share the same Cognito identity pool
- Build env files are generated with `cd app && npm run env:setup`
- `app/.env.local` is only for local `npm run dev`

## Standards location

Operational and coding rules now live in reusable skills under `.github/skills/`:
- `git-standards`
- `deployment`
- `environments`
- `data-management`
- `code-standards`

Do not duplicate those standards across every agent unless a workflow needs a direct reminder.

## Key files

- `plans/vX.Y.0-release.md` for active release plans (on release branches)
- `plans/vX.Y.Z-hotfix.md` for hotfix plans (on hotfix branches)
- `app/src/lib/s3.ts` for all S3 access
- `app/src/lib/config.ts` for player and scoring configuration
- `app/src/lib/date.ts` for day and reset logic
- `app/src/types/index.ts` for shared TypeScript types
- `scripts/` for deploy, backup, restore, delete, sync, and env generation utilities
- `scripts/whats-new.json` — source of truth for What's New page content; uploaded to `data/whats-new.json` in S3 on every deploy

## Release note

Always bump `app/package.json` to the release version. That version is injected into the app as `__APP_VERSION__`.
