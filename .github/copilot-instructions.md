# Lengle — Copilot Repository Instructions

## About this project
Lengle is a private family word puzzle game built as a static React (Vite + TypeScript + Tailwind CSS)
app hosted on AWS S3 static website hosting. All game data is stored as JSON files in S3.
There is no backend API, no database, and no server.

Full game rules: `specs/spec-game-design.md`
Technical architecture and conventions: `specs/spec-implementation.md`

## Release workflow
All changes ship through a named `release/vX.Y` branch (major + minor only, no patch versions). The release agent manages git, deployment, and merging. You handle code changes in Agent mode.

**Typical flow:**
1. Invoke `@release-agent` and say "start v1.1" — it creates the branch, interviews you, and writes `plans/release-v1.1.md`
2. Review and confirm the plan, then switch to **Agent mode** to implement the code changes
3. Come back to `@release-agent` to run checks (`npm run typecheck && npm run lint`), deploy, or close the release
4. When done, tell the release agent to close the release — it commits, pushes, and squash-merges to `main`

**Standard commit message format:**
```
vX.Y: One liner summary of the release

- Change description 1
- Change description 2
- Change description 3
```

Plan documents live at `plans/release-vX.Y.md`. One per release.

## Architecture rules — never violate these
- All S3 reads go through `app/src/lib/s3.ts → readJson()` (HTTP GET to S3 website URL)
- All S3 writes go through `app/src/lib/s3.ts → writeToS3()` (PUT directly to S3 via Cognito credentials)
- All S3 list operations go through `app/src/lib/s3.ts → listS3Keys()` (directly to S3 via Cognito credentials)
- Never use the AWS SDK for reads — use `readJson()` with plain fetch instead
- Never import the AWS SDK directly in components or hooks — always use `app/src/lib/s3.ts`
- All scoring constants come from `CONFIG.scoring` in `app/src/lib/config.ts` — never hardcode +0/+1/+3
- All date/reset logic goes through `app/src/lib/date.ts`
- Player names, IDs, and default emojis are defined only in `CONFIG.players` in `app/src/lib/config.ts`
- Player ID and emoji map are shared app-wide via `PlayerContext` in `app/src/App.tsx` — never prop-drill them
- TypeScript strict mode is on — no `any` types

## Key files
- `specs/spec-game-design.md` — all game rules and acceptance criteria (source of truth for behaviour)
- `specs/spec-implementation.md` — technical architecture and conventions (source of truth for implementation)
- `plans/` — one plan document per release, named `release-vX.X.md`
- `app/src/lib/config.ts` — all tuneable config
- `app/src/lib/s3.ts` — all S3 operations
- `app/src/lib/scoring.ts` — guess scoring
- `app/src/lib/date.ts` — date and reset logic
- `app/src/types/index.ts` — all TypeScript interfaces

## Spec update rule
When making ANY change to game behaviour or implementation, update the relevant section
of `specs/spec-game-design.md` and/or `specs/spec-implementation.md` in the same commit as the code change.
