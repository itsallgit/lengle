# Lengle — Implementation Specification

> Version 1.0 — This document defines the technical architecture, infrastructure, and development conventions for building Lengle. All behaviour requirements are defined in `spec-game-design.md`.

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (Vite) |
| Hosting | AWS S3 (static website) + CloudFront |
| Data store | AWS S3 (JSON files) |
| Infrastructure as Code | AWS CDK (TypeScript) |
| CI/CD | Manual deploy via CDK CLI + GitHub Copilot custom prompts |
| DNS & SSL | AWS Route 53 + AWS Certificate Manager (post-MVP) |
| Repository | GitHub |

---

## 2. Architecture Overview

Lengle is a fully client-side React application. There is no backend API, no database, and no server-side compute. All game state is stored as JSON files in a single S3 bucket. The React app reads and writes directly to S3 using the AWS SDK for JavaScript (browser client) with anonymous public/restricted access controlled by S3 bucket policies.

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│   React App (Vite)                               │
│   ├── Reads public data from S3                  │
│   └── Writes guess/word data to S3               │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
              ┌──────▼──────┐
              │  CloudFront  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  S3 Bucket   │
              │  /app/       │  ← React build output
              │  /data/      │  ← Game data (JSON)
              └─────────────┘
```

### Why No Backend?
At 3 players with low daily traffic, a backend API would add cost, complexity, and maintenance overhead with zero benefit. All data operations are simple JSON reads and writes. Word security (preventing accidental cheating) is achieved through client-side access discipline — see Section 5.

---

## 3. Repository Structure

```
lengle/
├── .github/
│   ├── copilot-instructions.md          ← Repo-level Copilot instructions
│   └── prompts/
│       ├── update-game.prompt.md        ← Copilot prompt: make game changes
│       └── deploy.prompt.md             ← Copilot prompt: deploy to production
├── infra/
│   ├── bin/
│   │   └── lengle.ts                    ← CDK app entry point
│   ├── lib/
│   │   └── lengle-stack.ts              ← CDK stack definition
│   ├── cdk.json
│   └── package.json
├── app/
│   ├── src/
│   │   ├── components/                  ← React components
│   │   ├── hooks/                       ← Custom React hooks
│   │   ├── lib/
│   │   │   ├── s3.ts                    ← S3 read/write helpers
│   │   │   ├── scoring.ts               ← Guess scoring logic
│   │   │   ├── validation.ts            ← Word validation logic
│   │   │   ├── date.ts                  ← Date/reset time helpers
│   │   │   └── config.ts                ← App config (player names, constants)
│   │   ├── types/                       ← TypeScript types
│   │   ├── words/
│   │   │   └── wordlist.ts              ← Bundled 5-letter word list
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── scripts/
│   └── deploy.sh                        ← Build + upload to S3 + invalidate CloudFront
├── spec-game-design.md
├── spec-implementation.md
└── README.md
```

---

## 4. Infrastructure (AWS CDK)

### 4.1 CDK Stack — `LengleStack`

A single CDK stack (`LengleStack`) provisions all AWS resources in one deployment.

**Resources provisioned:**

#### S3 Bucket (`LengleBucket`)
- Single bucket for both app files and game data
- Static website hosting disabled (CloudFront serves the content)
- Public access blocked at bucket level — CloudFront OAC is the only reader
- Versioning enabled to preserve historical data and allow rollback
- CORS configured to allow GET and PUT from the CloudFront domain
- Lifecycle rules: none (all data retained indefinitely)

#### CloudFront Distribution (`LengleDistribution`)
- Origin: the S3 bucket via Origin Access Control (OAC)
- Default root object: `index.html`
- Custom error response: 404 → `index.html` with 200 status (for React client-side routing)
- Cache behaviour for `/data/*`: cache disabled (always fresh)
- Cache behaviour for `/app/*`: cache enabled with long TTL (content-addressed by Vite build hashes)
- HTTPS only; HTTP redirected to HTTPS
- Price class: PriceClass_100 (North America + Europe — cheapest tier)

#### S3 Bucket Policy
- CloudFront OAC can `s3:GetObject` on all paths
- Authenticated browser clients can `s3:PutObject` on `/data/*` paths only
- No public `s3:PutObject` — write access uses pre-signed URLs generated client-side via the AWS SDK with a scoped IAM policy (see Section 6)

#### IAM — Cognito Identity Pool (`LengleIdentityPool`)
- Unauthenticated identity pool (no login required)
- Unauthenticated role allows:
  - `s3:GetObject` on `arn:aws:s3:::lengle-bucket/data/*`
  - `s3:PutObject` on `arn:aws:s3:::lengle-bucket/data/*`
- This is the mechanism by which the browser app reads and writes game data without a backend

> Note: Cognito unauthenticated identities provide scoped, temporary AWS credentials to the browser. This is the standard pattern for browser-to-S3 direct access without a backend.

### 4.2 CDK Commands

```bash
# First-time setup
cd infra
npm install
npx cdk bootstrap   # Once per AWS account/region

# Deploy
npx cdk deploy

# Destroy all resources
npx cdk destroy
```

### 4.3 Post-MVP: Custom Domain

When adding a custom domain, the following additional resources are added to the CDK stack:

1. **Route 53 Hosted Zone** — created manually by the user (see README for step-by-step)
2. **ACM Certificate** — provisioned in `us-east-1` (required for CloudFront)
3. **CloudFront Alias** — domain added to the distribution
4. **Route 53 A Record** — alias to CloudFront distribution

Custom domain work is isolated to `lengle-stack.ts` and gated behind a config flag in `cdk.json`:
```json
{
  "customDomain": {
    "enabled": false,
    "domainName": "lengle.yourdomain.com",
    "hostedZoneId": ""
  }
}
```

---

## 5. Data Architecture

### 5.1 S3 Folder Structure

```
s3://lengle-bucket/
├── app/                          ← React build output (uploaded by deploy script)
│   ├── index.html
│   ├── assets/
│   └── ...
└── data/
    ├── players.json              ← Player registry
    ├── word-history.json         ← All past puzzle words (append-only)
    ├── days/
    │   └── {YYYY-MM-DD}/
    │       ├── status.json       ← Lobby status (words set, not the words)
    │       ├── guesses.json      ← All guesses for the day
    │       └── results.json      ← Daily results (written when day closes)
    └── words/
        └── {YYYY-MM-DD}/
            ├── {setter-id}.json  ← The puzzle word set by this player
```

### 5.2 Word Security (Option B — Delayed Reveal)

The `/data/words/{date}/{setter-id}.json` files contain the actual puzzle words. The app enforces the following access discipline:

- The app **never fetches** a word file for the current day's puzzle unless the current player has a recorded correct guess (`is_correct: true`) on that puzzle in `guesses.json`
- Word files for **past days** are freely readable (used for Word History)
- There is no server-side enforcement — security relies on client-side discipline, which is sufficient to prevent accidental cheating among family members

### 5.3 JSON Schemas

#### `players.json`
```json
{
  "players": [
    { "id": "player_1", "name": "Alex" },
    { "id": "player_2", "name": "Mum" },
    { "id": "player_3", "name": "Dad" }
  ]
}
```

#### `data/days/{date}/status.json`
```json
{
  "date": "2026-03-30",
  "words_set": {
    "player_1": true,
    "player_2": true,
    "player_3": false
  },
  "unlocked": false
}
```

#### `data/words/{date}/{setter-id}.json`
```json
{
  "date": "2026-03-30",
  "setter_id": "player_1",
  "word": "CRANE",
  "submitted_at": "2026-03-29T21:14:00.000Z"
}
```

#### `data/days/{date}/guesses.json`
```json
{
  "date": "2026-03-30",
  "guesses": [
    {
      "puzzle_setter_id": "player_1",
      "guesser_id": "player_2",
      "guess_number": 1,
      "word": "STARE",
      "per_letter_scores": [3, 0, 1, 3, 1],
      "score": 8,
      "is_correct": false,
      "submitted_at": "2026-03-30T09:22:00.000Z"
    }
  ]
}
```

#### `data/days/{date}/results.json`
```json
{
  "date": "2026-03-30",
  "results": [
    {
      "player_id": "player_2",
      "total_guesses": 5,
      "puzzles_solved": 2,
      "is_daily_winner": true
    }
  ],
  "puzzle_winners": [
    { "setter_id": "player_1", "winner_id": "player_2", "guess_count": 3 },
    { "setter_id": "player_2", "winner_id": "player_1", "guess_count": 2 }
  ]
}
```

#### `data/word-history.json`
```json
{
  "words": [
    { "date": "2026-03-30", "setter_id": "player_1", "word": "CRANE" },
    { "date": "2026-03-30", "setter_id": "player_2", "word": "BLUNT" },
    { "date": "2026-03-30", "setter_id": "player_3", "word": "FROST" }
  ]
}
```

### 5.4 Concurrency Handling

Because multiple players may write to `guesses.json` simultaneously, the app uses an **optimistic read-modify-write** pattern:

1. Fetch current `guesses.json`
2. Append the new guess
3. Write back the full updated file

At 3 players making occasional async guesses, the probability of a true write collision is negligible. If a collision does occur, the last write wins — the worst outcome is one guess being overwritten, which the player would notice immediately and re-submit.

For `status.json`, writes are single-field updates (marking a player's word as set) and follow the same pattern.

---

## 6. Frontend Application

### 6.1 Configuration (`src/lib/config.ts`)

All tuneable values are centralised in a single config file:

```typescript
export const CONFIG = {
  players: [
    { id: "player_1", name: "Alex" },
    { id: "player_2", name: "Mum" },
    { id: "player_3", name: "Dad" },
  ],
  scoring: {
    correctPosition: 0,
    correctLetter: 1,
    notInWord: 3,
  },
  resetHour: 4, // 4am local time
  wordLength: 5,
  s3: {
    bucketName: "lengle-bucket",        // Set at build time via env var
    region: "ap-southeast-2",
    cognitoIdentityPoolId: "...",        // Set at build time via env var
  },
};
```

### 6.2 Scoring Logic (`src/lib/scoring.ts`)

```typescript
type LetterScore = 0 | 1 | 3;

export function scoreGuess(guess: string, target: string): {
  perLetter: LetterScore[];
  total: number;
  isCorrect: boolean;
}
```

- Implements the +0/+1/+3 mechanic per letter position
- Handles duplicate letters per the spec (Section 5.3 of game design spec)
- Returns per-letter scores, total score, and whether the guess is correct

### 6.3 Date Logic (`src/lib/date.ts`)

```typescript
// Returns the active puzzle date string (YYYY-MM-DD)
// accounting for the 4am local reset
export function getActivePuzzleDate(): string

// Returns true if a new day has started since the given date
export function hasNewDayStarted(lastKnownDate: string): boolean
```

### 6.4 S3 Helpers (`src/lib/s3.ts`)

```typescript
// Read a JSON file from S3
export async function readS3Json<T>(key: string): Promise<T | null>

// Write a JSON file to S3 (full overwrite)
export async function writeS3Json(key: string, data: unknown): Promise<void>

// Check if a file exists in S3
export async function s3FileExists(key: string): Promise<boolean>
```

### 6.5 Component Structure

```
src/components/
├── PlayerSelect/
│   └── PlayerSelect.tsx
├── Lobby/
│   ├── Lobby.tsx
│   ├── WordSetForm.tsx
│   └── PlayerStatusList.tsx
├── Puzzles/
│   ├── PuzzleView.tsx
│   ├── PuzzlePanel.tsx
│   ├── GuessList.tsx
│   ├── GuessRow.tsx
│   ├── GuessInput.tsx
│   └── OthersPanel.tsx
├── Leaderboard/
│   ├── Leaderboard.tsx
│   ├── TodayTab.tsx
│   ├── AllTimeTab.tsx
│   └── TrendsTab.tsx
├── WordHistory/
│   ├── WordHistory.tsx
│   └── DayEntry.tsx
└── shared/
    ├── Header.tsx
    └── Nav.tsx
```

### 6.6 Routing

Client-side routing via React Router:

| Path | Component |
|---|---|
| `/` | PlayerSelect |
| `/lobby` | Lobby |
| `/play` | PuzzleView |
| `/leaderboard` | Leaderboard |
| `/history` | WordHistory |

CloudFront is configured to return `index.html` for all 404s to support client-side routing.

---

## 7. Deployment

### 7.1 Deploy Script (`scripts/deploy.sh`)

```bash
#!/bin/bash
set -e

echo "Building React app..."
cd app && npm run build && cd ..

echo "Uploading app to S3..."
aws s3 sync app/dist/ s3://$BUCKET_NAME/app/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# index.html should not be cached
aws s3 cp app/dist/index.html s3://$BUCKET_NAME/app/index.html \
  --cache-control "no-cache"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/app/*"

echo "Deploy complete."
```

### 7.2 Environment Variables

Set in shell or `.env.local` (never committed):

| Variable | Description |
|---|---|
| `BUCKET_NAME` | S3 bucket name (output from CDK deploy) |
| `DISTRIBUTION_ID` | CloudFront distribution ID (output from CDK deploy) |
| `VITE_COGNITO_IDENTITY_POOL_ID` | Cognito identity pool ID (output from CDK deploy) |
| `VITE_S3_BUCKET_NAME` | S3 bucket name for browser SDK |
| `VITE_AWS_REGION` | AWS region |

CDK outputs all required values after `cdk deploy`. The README includes copy-paste instructions for setting these up.

### 7.3 Data Preservation on Deploy

- App files live under `/app/` — synced and overwritten on every deploy
- Game data lives under `/data/` — **never touched by the deploy script**
- S3 versioning is enabled — all previous versions of data files are retained and recoverable
- Deploying a new version of the app never affects historical game data

---

## 8. GitHub Copilot Integration

### 8.1 Repository-Level Instructions (`.github/copilot-instructions.md`)

This file provides Copilot with always-on context for the repository:

```markdown
# Lengle — Copilot Repository Instructions

## About this project
Lengle is a private family word game. It is a static React (Vite + TypeScript) app
hosted on AWS S3 + CloudFront. All game data is stored as JSON files in S3.
There is no backend API or database.

## Key files
- `spec-game-design.md` — all game rules and acceptance criteria (implementation-agnostic)
- `spec-implementation.md` — technical architecture and conventions
- `app/src/lib/config.ts` — all tuneable game config (scoring, players, reset time)
- `app/src/lib/scoring.ts` — guess scoring logic
- `app/src/lib/s3.ts` — all S3 read/write operations

## Spec update rule
When making ANY change to game behaviour or implementation architecture,
you MUST update the relevant section of spec-game-design.md and/or
spec-implementation.md to reflect the change before considering the task complete.
Always update specs as part of the same commit as the code change.

## Conventions
- All scoring constants come from CONFIG.scoring — never hardcode +0/+1/+3 inline
- All S3 operations go through src/lib/s3.ts — never use the AWS SDK directly in components
- All date/reset logic goes through src/lib/date.ts
- Player names and IDs are defined only in CONFIG.players
- TypeScript strict mode is enabled — no `any` types
```

### 8.2 Game Change Prompt (`.github/prompts/update-game.prompt.md`)

````markdown
# Copilot Prompt: Update Game

Use this prompt when making a change to Lengle's game behaviour, UI, or configuration.

## Instructions for Copilot

1. Read `spec-game-design.md` and `spec-implementation.md` in full before making changes
2. Identify which acceptance criteria are affected by this change
3. Make the code change
4. Update the affected sections of `spec-game-design.md` and/or `spec-implementation.md`
5. If scoring constants change, update only `app/src/lib/config.ts`
6. If player names change, update only `CONFIG.players` in `app/src/lib/config.ts`
7. Run `npm run typecheck` and `npm run lint` and fix any errors before finishing
8. Summarise what was changed in code and which spec sections were updated

## Change requested:

[DESCRIBE YOUR CHANGE HERE]
````

### 8.3 Deploy Prompt (`.github/prompts/deploy.prompt.md`)

````markdown
# Copilot Prompt: Deploy to Production

Use this prompt to deploy the current state of the app to production.

## Instructions for Copilot

1. Confirm there are no TypeScript errors: run `cd app && npm run typecheck`
2. Confirm there are no lint errors: run `cd app && npm run lint`
3. Run the deploy script: `bash scripts/deploy.sh`
4. Confirm the CloudFront invalidation was created
5. Report the live URL from the CDK outputs

## Pre-deploy checklist (confirm each before proceeding):
- [ ] All intended code changes are committed
- [ ] `spec-game-design.md` and `spec-implementation.md` are up to date
- [ ] No TypeScript or lint errors
- [ ] `BUCKET_NAME`, `DISTRIBUTION_ID`, and Vite env vars are set in the shell
````

---

## 9. README Structure

The `README.md` in the repository root must cover the following sections in order:

1. **What is Lengle** — one paragraph
2. **Prerequisites** — Node.js version, AWS CLI, CDK CLI, AWS account setup
3. **First-time setup** — clone repo, install dependencies, configure AWS credentials
4. **Deploy infrastructure** — `cdk bootstrap` + `cdk deploy`, capturing output values
5. **Configure environment variables** — copy-paste instructions from CDK outputs
6. **Deploy the app** — running `scripts/deploy.sh`
7. **Adding players** — how to edit `CONFIG.players`
8. **Tuning scoring** — how to edit `CONFIG.scoring`
9. **Adding a custom domain (post-MVP)** — step-by-step: register domain, create Route 53 hosted zone, set `customDomain.enabled: true` in `cdk.json`, re-run `cdk deploy`
10. **Recovering data** — how to use S3 versioning to restore a previous version of a data file
11. **Troubleshooting** — common issues (CORS errors, stale CloudFront cache, Cognito credential errors)

---

## 10. Cost Estimate

At 3 players with typical daily usage:

| Service | Expected monthly cost |
|---|---|
| S3 storage (app + data) | < $0.01 |
| S3 requests | < $0.01 |
| CloudFront (PriceClass_100) | < $0.01 |
| Cognito Identity Pool | Free (always free tier) |
| **Total** | **< $1.00/month** |

---

## 11. Post-MVP Improvements (Not in Scope for v1)

- Custom domain + HTTPS via Route 53 + ACM (infrastructure already prepared)
- Push notifications via SNS when all words are set
- Automated daily word suggestions
- Admin view for manually correcting bad data in S3
- GitHub Actions for automated deploys on push to `main`