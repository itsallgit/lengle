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

- On `main` with no `plans/draft.md`: feature planning routes to Plan Agent
- On `main` with `plans/draft.md` but no Technical Implementation section: design routes to Design Agent
- On `main` with a fully designed `plans/draft.md`: release start routes to Release Agent
- On `release/vX.Y` or `hotfix/vX.Y.Z`: implementation routes to Build Agent
- On `release/vX.Y` or `hotfix/vX.Y.Z`: deploy-for-testing, release status, and close-release routes to Release Agent
- On any branch: production deploys, backups, restores, cleanup, and rollback routes to Production Agent

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

- `plans/draft.md` for pre-release planning
- `plans/release-vX.Y.md` for active release execution
- `app/src/lib/s3.ts` for all S3 access
- `app/src/lib/config.ts` for player and scoring configuration
- `app/src/lib/date.ts` for day and reset logic
- `app/src/types/index.ts` for shared TypeScript types
- `scripts/` for deploy, backup, restore, delete, sync, and env generation utilities

## Release note

Always bump `app/package.json` to the release version. That version is injected into the app as `__APP_VERSION__`.
