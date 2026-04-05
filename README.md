# Lengle

A private daily word puzzle game for a family of three.

Each day, every player secretly sets a 5-letter word for the other two to guess. You get unlimited guesses, but each one costs you — the scoring is numeric (+0 for a correct letter in the right spot, +1 for right letter wrong spot, +3 for not in the word at all). Lower total score is better. The player who solves both puzzles in the fewest guesses wins the day.

Built as a fully static React app on AWS S3. No backend, no database — all game state lives as JSON files in S3, read and written directly from the browser.

---

## How to play

1. Open the app and select your name from the dropdown
2. In the Lobby, set your secret word for the other players
3. Once both other players have set their words, a "Play" button appears — tap it to start guessing
4. Guess each 5-letter word. After each guess you see your score for that guess
5. Solve both puzzles to finalise your score for the day
6. Check the Leaderboard to see how everyone did

---

## Making changes

All development happens through **GitHub Copilot in VS Code**. Two custom agents handle the full workflow:

- **`@release-agent`** — manages git branches, planning, deployment, and merging. You talk to it in plain English; it handles all the technical scaffolding.
- **Build Agent** (default Agent mode, no custom agent selected) — reads the plan and implements all the code changes. It reviews assumptions, asks clarifying questions, then builds everything and fixes any errors automatically.

### Step-by-step

**1. Open Copilot Chat and start a release**

Press `Ctrl+Shift+I` to open the chat panel. Select `@release-agent` from the agent picker, then describe what you want to change:

> `@release-agent start v1.5 — I want to change the leaderboard heading colour to blue`

The release agent will:
- Create a `release/v1.5` branch
- Ask you clarifying questions about each change
- Research the relevant files in the codebase
- Write a detailed plan to `plans/release-v1.5.md`

**2. Review the plan**

Open `plans/release-v1.5.md` and check it makes sense. You don't need to understand the code — just confirm the plain-English descriptions match what you asked for.

**3. Implement the changes with the Build Agent**

Switch to **Agent mode** (click the agent picker and choose the default agent — not `@release-agent`). Then say:

> `Implement the plan`

The build agent will:
- Read the plan and all the relevant source files
- Ask you a numbered list of questions if anything is ambiguous, with a recommendation for each one
- Wait for your answers (or accept all recommendations if you say "go ahead")
- Implement every change in the plan, phase by phase
- Run `npm run typecheck && npm run lint` after each phase and fix any errors before continuing
- Report back with a list of all files changed

**4. Deploy**

Switch back to `@release-agent` and say:

> `deploy`

It will run checks, build the app, and upload it to S3.

**5. Close the release**

> `close the release`

The release agent writes a commit message (and shows it to you for confirmation), then commits, pushes, and squash-merges to `main`.

### What to say to `@release-agent`

| You say | What happens |
|---|---|
| `start v1.5` | Creates branch, interviews you, writes `plans/release-v1.5.md` |
| `run checks` | Runs `npm run typecheck && npm run lint` |
| `deploy` | Runs checks, builds, uploads to S3 |
| `what needs doing` | Summarises open items from the plan |
| `close the release` | Commits, pushes, squash-merges to `main` |
| `backup game data` | Archives all S3 data to `backups/` and commits |
| `delete game data` | Deletes all S3 game data (always backup first) |

### Useful slash commands

Type `/` in any Copilot Chat session to access these prompts:

| Prompt | Use for |
|---|---|
| `/deploy` | Typecheck, lint, build, and deploy to S3 |
| `/backup-game-data` | Archive all S3 game data to `backups/` and commit |
| `/delete-game-data` | Delete all S3 game data (run a backup first) |
| `/restore-game-data` | Restore a previous backup to S3 |

---

## Key files

| File | What it contains |
|---|---|
| [`specs/spec-game-design.md`](specs/spec-game-design.md) | Every game rule and acceptance criterion — source of truth for behaviour |
| [`specs/spec-implementation.md`](specs/spec-implementation.md) | Architecture decisions, data schemas, component conventions |
| [`app/src/lib/config.ts`](app/src/lib/config.ts) | Players, scoring constants, all tuneable values |
| [`app/src/lib/s3.ts`](app/src/lib/s3.ts) | All S3 read/write/list operations |
| [`app/src/types/index.ts`](app/src/types/index.ts) | All TypeScript interfaces |
| [`cdk-outputs.json`](cdk-outputs.json) | AWS resource names (`BucketName`, `WebsiteUrl`, `IdentityPoolId`) |
| [`plans/`](plans/) | One plan document per release — written by the release agent |

---

## Local development

### Prerequisites

- Node.js 18+
- AWS CLI v2 (for deploy/data scripts)

### Setup

```bash
cd app && npm install
```

Copy `app/.env.local.example` to `app/.env.local` and fill in the values from `cdk-outputs.json`:

```
VITE_S3_BUCKET_NAME=<BucketName>
VITE_S3_WEBSITE_URL=<WebsiteUrl>
VITE_COGNITO_IDENTITY_POOL_ID=<IdentityPoolId>
```

### Run

```bash
cd app && npm run dev
```

The app reads and writes live S3 data even in local dev — there is no local mock layer. Run `/backup-game-data` before experimenting locally.

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
