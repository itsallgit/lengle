# Lengle

A private daily word puzzle game for a family of three. Each player sets a secret 5-letter word for the other two to guess. Feedback is numeric — every guess scores +0 (correct position), +1 (right letter, wrong position), or +3 (not in the word) per letter. The player who solves both puzzles in the fewest total guesses wins the day.

Built as a fully static React app on AWS S3. No backend, no database, no auth — all game state is stored as JSON files in S3 and read/written directly from the browser.

---

## Why it was built this way

**No backend.** At 3 players with low daily traffic, a backend adds cost, ops overhead, and complexity with no benefit. All operations are simple JSON reads and writes. S3 does the job.

**No auth.** It's a family game. Trust is assumed. Players select their name from a dropdown; the selection is remembered in `localStorage`. Word security (not accidentally seeing the answer) is enforced by the client simply not rendering it until the puzzle is solved — the file is fetched for scoring, just never displayed early.

**No real-time.** The lobby polls `status.json` every 30 seconds. That's enough for a relaxed async daily game.

**Numeric scoring instead of colours.** Wordle-style colour blocks are everywhere. The numeric mechanic (+0/+1/+3) makes each guess feel more like a calculation, and forces sharper thinking about letter placement.

**AI-assisted development.** The entire codebase was written with GitHub Copilot as a pair programmer. The specs, release process, and agent configuration are all designed to make that workflow efficient and repeatable. See [How to work on this project](#how-to-work-on-this-project) below.

---

## Repository structure

```
lengle/
├── specs/
│   ├── spec-game-design.md          ← All game rules and acceptance criteria (source of truth)
│   └── spec-implementation.md       ← Technical architecture and conventions (source of truth)
├── plans/
│   ├── plan-MVP.md                  ← Step-by-step guide used to build the MVP with an AI agent
│   └── release-v1.0.md              ← Release plan for v1.0
├── .github/
│   ├── copilot-instructions.md      ← Repo-level context injected into every Copilot session
│   ├── agents/
│   │   └── release-agent.agent.md  ← Release Agent: manages git, planning, deploy, and merge
│   └── prompts/
│       ├── deploy.prompt.md
│       ├── backup-game-data.prompt.md
│       ├── delete-game-data.prompt.md
│       └── restore-game-data.prompt.md
├── app/                             ← React + Vite + TypeScript frontend
│   └── src/
│       ├── components/              ← UI components (Lobby, Puzzles, Leaderboard, WordHistory)
│       ├── hooks/                   ← useS3Poll, useResultsFinalisation
│       ├── lib/
│       │   ├── s3.ts                ← All S3 read/write/list operations — touch nothing else
│       │   ├── config.ts            ← Players, scoring constants, all tuneable config
│       │   ├── scoring.ts           ← Guess scoring logic
│       │   ├── date.ts              ← Puzzle date and 4am reset logic
│       │   └── validation.ts        ← Word validation
│       ├── types/index.ts           ← All TypeScript interfaces
│       └── words/wordlist.ts        ← Bundled 5-letter word list
├── infra/                           ← AWS CDK stack (S3, Cognito)
├── scripts/
│   ├── deploy.sh
│   ├── backup-data.sh
│   ├── delete-data.sh
│   └── restore-data.sh
├── backups/                         ← Timestamped S3 data backups (committed to git)
├── cdk-outputs.json                 ← CDK stack outputs (BucketName, WebsiteUrl, etc.)
└── players.json                     ← Bootstrap file for initial S3 upload
```

---

## Architecture at a glance

| Concern | How |
|---|---|
| Hosting | AWS S3 static website |
| Reads | Plain `fetch()` to the S3 website URL via `readJson()` in `s3.ts` |
| Writes | AWS SDK `PutObjectCommand` with Cognito unauthenticated credentials via `writeToS3()` |
| List operations | AWS SDK `ListObjectsV2` with Cognito credentials via `listS3Keys()` |
| Auth | None — Cognito unauthenticated identity pool provides temporary S3 credentials |
| State | JSON files in S3 under `data/` — no database |
| Config | `app/src/lib/config.ts` — players, scoring values, everything tuneable lives here |

**Hard rules (never break these):**
- All S3 operations go through `app/src/lib/s3.ts` — never import the AWS SDK in components
- All scoring constants come from `CONFIG.scoring` — never hardcode +0/+1/+3
- All date/reset logic goes through `app/src/lib/date.ts`
- Player names and IDs live only in `CONFIG.players` in `config.ts`
- TypeScript strict mode is on — no `any` types

The full rationale for every architecture decision is in [`specs/spec-implementation.md`](specs/spec-implementation.md).

---

## How to work on this project

All development happens through **GitHub Copilot in VS Code**. The repo is set up so the AI agent has all the context it needs to make correct changes without you explaining the codebase each time.

### The release agent

The `@release-agent` custom agent manages the full release lifecycle. You talk to it; it handles git, planning, deployment, and merging.

```
Ctrl+Shift+I  (or Cmd+Shift+I on Mac)
→ Select @release-agent from the agent picker
→ "start v1.1"
```

**What the release agent does for you:**

| You say | Agent does |
|---|---|
| "start v1.1" | Checks for unmerged releases, creates `release/v1.1` branch, interviews you, researches codebase, writes `plans/release-v1.1.md` |
| "run checks" | Runs `npm run typecheck && npm run lint`, reports results |
| "deploy" | Runs pre-deploy checks + `bash scripts/deploy.sh` |
| "what needs doing" | Summarises open items from the plan doc |
| "close the release" | Runs final checks, builds commit message (confirmed with you), commits, pushes, squash-merges to `main` |

**You do:** switch to Agent mode in Copilot Chat to implement the actual code changes described in the plan.

### Making a code change

1. Talk to `@release-agent` — it creates the branch and writes the plan
2. Review `plans/release-vX.Y.md`
3. Switch to **Agent mode** (default agent, not release-agent)
4. Implement: `Implement the plan in plans/release-vX.Y.md`
5. Come back to `@release-agent` to run checks, deploy, and close the release

### Copilot prompts (slash commands)

Type `/` in any Copilot Chat session:

| Prompt | Use for |
|---|---|
| `/deploy` | Typecheck, lint, build, and deploy to S3 |
| `/backup-game-data` | Archive all S3 game data to `backups/` and commit |
| `/delete-game-data` | Delete all S3 game data (verifies backup exists first) |
| `/restore-game-data` | Restore a previous backup to S3 |

Before any data operation, set `BUCKET_NAME`:
```bash
export BUCKET_NAME=$(cat cdk-outputs.json | grep BucketName | awk -F'"' '{print $4}')
```

### Commit message format

```
vX.Y: One liner summary of the release

- Change description 1
- Change description 2
- Change description 3
```

The release agent generates this for you at close time.

---

## Key reference files

| File | What it contains |
|---|---|
| [`specs/spec-game-design.md`](specs/spec-game-design.md) | Every game rule and acceptance criterion |
| [`specs/spec-implementation.md`](specs/spec-implementation.md) | Every architecture decision, schema, component structure, and convention |
| [`app/src/lib/config.ts`](app/src/lib/config.ts) | Players, scoring constants, all tuneable values |
| [`app/src/types/index.ts`](app/src/types/index.ts) | All TypeScript interfaces |
| [`app/src/lib/s3.ts`](app/src/lib/s3.ts) | `readJson()`, `writeToS3()`, `listS3Keys()` |
| [`cdk-outputs.json`](cdk-outputs.json) | `BucketName`, `WebsiteUrl`, `IdentityPoolId` |
| [`plans/plan-MVP.md`](plans/plan-MVP.md) | The step-by-step guide used to build the MVP |

---

## Local development setup

### Prerequisites

- Node.js 18+
- AWS CLI v2 with a `lengle` profile configured
- `BUCKET_NAME` environment variable set

### Install dependencies

```bash
cd app && npm install
cd ../infra && npm install
```

### Environment variables

Copy `app/.env.local.example` to `app/.env.local` and fill in values from `cdk-outputs.json`:

```bash
VITE_S3_BUCKET_NAME=<BucketName>
VITE_S3_WEBSITE_URL=<WebsiteUrl>
VITE_COGNITO_IDENTITY_POOL_ID=<IdentityPoolId>
```

### Run locally

```bash
cd app && npm run dev
```

The app reads and writes live S3 data even in local dev — there is no local data layer. Run `/backup-game-data` before experimenting.

### Type check and lint

```bash
cd app && npm run typecheck && npm run lint
```

Both must pass before any deployment.

---

## Deploying

```bash
bash scripts/deploy.sh
```

The live URL is the `WebsiteUrl` value in `cdk-outputs.json`.

For first-time infrastructure setup, see [`plans/plan-MVP.md`](plans/plan-MVP.md).

---

## Recovering game data

S3 versioning is enabled. To restore a previous version of a data file:

```bash
# List versions
aws s3api list-object-versions \
  --bucket $BUCKET_NAME \
  --prefix data/days/2026-04-01/guesses-player_1.json

# Restore a version
aws s3api copy-object \
  --bucket $BUCKET_NAME \
  --copy-source "$BUCKET_NAME/data/days/2026-04-01/guesses-player_1.json?versionId=<VERSION_ID>" \
  --key data/days/2026-04-01/guesses-player_1.json
```

Or use the `/restore-game-data` prompt to restore a full backup from `backups/`.
