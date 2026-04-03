# Lengle — Copilot Repository Instructions

## About this project
Lengle is a private family word puzzle game built as a static React (Vite + TypeScript + Tailwind CSS)
app hosted on AWS S3 static website hosting. All game data is stored as JSON files in S3.
There is no backend API, no database, and no server.

Full game rules: `specs/spec-game-design.md`
Technical architecture and conventions: `specs/spec-implementation.md`

## Architecture rules — never violate these
- All S3 reads go through `app/src/lib/s3.ts → readJson()` (HTTP GET to S3 website URL)
- All S3 writes go through `app/src/lib/s3.ts → writeToS3()` (PUT directly to S3 via Cognito credentials)
- All S3 list operations go through `app/src/lib/s3.ts → listS3Keys()` (directly to S3 via Cognito credentials)
- Never use the AWS SDK for reads — use `readJson()` with plain fetch instead
- Never import the AWS SDK directly in components or hooks — always use `app/src/lib/s3.ts`
- All scoring constants come from `CONFIG.scoring` in `app/src/lib/config.ts` — never hardcode +0/+1/+3
- All date/reset logic goes through `app/src/lib/date.ts`
- Player names and IDs are defined only in `CONFIG.players` in `app/src/lib/config.ts`
- Player ID is shared app-wide via `PlayerContext` defined in `app/src/App.tsx` — never prop-drill it
- TypeScript strict mode is on — no `any` types

## Key files
- `specs/spec-game-design.md` — all game rules and acceptance criteria (source of truth for behaviour)
- `specs/spec-implementation.md` — technical architecture and conventions (source of truth for implementation)
- `app/src/lib/config.ts` — all tuneable config
- `app/src/lib/s3.ts` — all S3 operations
- `app/src/lib/scoring.ts` — guess scoring
- `app/src/lib/date.ts` — date and reset logic
- `app/src/types/index.ts` — all TypeScript interfaces

## Spec update rule
When making ANY change to game behaviour or implementation, update the relevant section
of `specs/spec-game-design.md` and/or `specs/spec-implementation.md` in the same commit as the code change.
