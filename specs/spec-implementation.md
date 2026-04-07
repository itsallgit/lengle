# Lengle — Implementation Specification

> Version 1.7 — This document defines the technical architecture, infrastructure, and development conventions for building Lengle. All behaviour requirements are defined in `spec-game-design.md`.

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (Vite) |
| Styling | Tailwind CSS v3 |
| Charting | *(removed — Trends tab deleted in v1.7)* |
| Hosting | AWS S3 static website hosting |
| Data store | AWS S3 (JSON files) |
| Infrastructure as Code | AWS CDK v2 (TypeScript) |
| AWS Region | `ap-southeast-2` (Sydney) |
| CI/CD | Manual deploy via CDK CLI + GitHub Copilot custom prompts |
| DNS & SSL | AWS Route 53 + AWS Certificate Manager (post-MVP) |
| Repository | GitHub |

---

## 2. Architecture Overview

Lengle is a fully client-side React application. There is no backend API, no database, and no server-side compute. All game state is stored as JSON files in a single S3 bucket. The React app is served directly from S3 static website hosting. All reads (game data) are plain HTTP GETs against the S3 website endpoint. All writes use the AWS SDK with temporary credentials from a Cognito unauthenticated identity pool.

```
┌─────────────────────────────────────────────────────┐
│                      Browser                         │
│                                                      │
│   React App (Vite + TypeScript + Tailwind)           │
│   ├── Reads data → S3 website endpoint (HTTP GET)    │
│   └── Writes data → S3 directly via AWS SDK          │
│                      (Cognito temp credentials)      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP GET + HTTPS PUT
                ┌──────▼──────┐
                │  S3 Bucket   │
                │  (static     │
                │   website)   │
                └─────────────┘
```

> **MVP note:** The app is served over HTTP (not HTTPS). CloudFront, which provides HTTPS and a CDN, is a post-MVP addition. See §4.3 for the upgrade path. Cognito SDK calls work correctly over HTTP for a private family game on modern browsers.

> **Read vs Write:** Reads use plain `fetch()` against the S3 website URL. Writes use the AWS SDK `PutObjectCommand` directly with Cognito credentials. The S3 bucket CORS policy must allow both GET and PUT from the S3 website origin.

### Why No Backend?
At 3 players with low daily traffic, a backend API adds cost, complexity, and maintenance overhead with no benefit. All data operations are simple JSON reads and writes. Word security (preventing accidental cheating) is achieved through client-side access discipline — see Section 5.

---

## 3. Repository Structure

```
lengle/
├── specs/
│   ├── spec-game-design.md          ← All game rules and acceptance criteria
│   └── spec-implementation.md       ← Technical architecture and conventions
├── plans/
│   └── release-v1.0.md              ← Release plan (one file per release)
├── .github/
│   ├── copilot-instructions.md          ← Repo-level Copilot instructions
│   ├── agents/
│   │   └── release-agent.agent.md       ← Release Agent custom agent
│   └── prompts/
│       ├── deploy.prompt.md             ← Copilot prompt: deploy to production
│       ├── backup-game-data.prompt.md   ← Copilot prompt: backup S3 data
│       ├── delete-game-data.prompt.md   ← Copilot prompt: delete S3 data
│       └── restore-game-data.prompt.md  ← Copilot prompt: restore S3 data from backup
├── infra/
│   ├── bin/
│   │   └── lengle.ts                    ← CDK app entry point
│   ├── lib/
│   │   └── lengle-stack.ts              ← CDK stack definition
│   ├── cdk.json                         ← CDK config incl. custom domain flag
│   └── package.json
├── app/
│   ├── src/
│   │   ├── components/                  ← React components (see Section 6.5)
│   │   ├── hooks/                       ← Custom React hooks
│   │   ├── lib/
│   │   │   ├── s3.ts                    ← S3 read/write helpers
│   │   │   ├── scoring.ts               ← Guess scoring logic
│   │   │   ├── validation.ts            ← Word validation logic
│   │   │   ├── date.ts                  ← Date/reset time helpers
│   │   │   └── config.ts                ← App config (player names, constants)
│   │   ├── types/
│   │   │   └── index.ts                 ← All TypeScript interfaces (see Section 6.7)
│   │   ├── words/
│   │   │   └── wordlist.ts              ← Bundled 5-letter word list (exported as Set<string>)
│   │   ├── index.css                    ← Tailwind CSS directives
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts                   ← Must set base: '/' (see Section 6.1)
│   ├── .env.local.example               ← Template for environment variables
│   └── package.json
├── scripts/
│   ├── deploy.sh                        ← Build + upload to S3
│   ├── backup-data.sh                   ← Backup S3 data to backups/ folder
│   ├── delete-data.sh                   ← Delete all S3 game data
│   └── restore-data.sh                  ← Restore S3 data from a backup
├── backups/                             ← Git-committed S3 data backups (timestamped)
├── players.json                         ← Bootstrap file for initial S3 upload
└── README.md
```

---

## 4. Infrastructure (AWS CDK v2)

### 4.1 CDK Stack — `LengleStack`

A single CDK stack (`LengleStack`) in `ap-southeast-2` provisions all AWS resources.

**Resources provisioned:**

#### S3 Bucket (`LengleBucket`)
- Single bucket for both app files and game data
- Static website hosting: **enabled** — this serves the React app and all game data reads
- Index document: `index.html`
- Error document: `index.html` — this enables React Router client-side routing (a missing-key 404 returns `index.html` instead, which React Router handles)
- Block public access: **disabled** — S3 static website hosting requires public read access
- Bucket policy: allow `s3:GetObject` on `arn:aws:s3:::${bucket.bucketName}/*` for all principals (`*`) — required for static website hosting
- Versioning: **enabled** (preserves all historical data, enables rollback)
- CORS configuration:
  ```json
  [
    {
      "AllowedOrigins": ["http://<bucket-website-endpoint>"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
  ```
  > The S3 website endpoint is known after first deploy. On first deploy, set `AllowedOrigins` to `["*"]`, then update to the specific endpoint and redeploy.
- Lifecycle rules: none (all data retained indefinitely)

#### Cognito Identity Pool (`LengleIdentityPool`)
- Unauthenticated identities: **enabled** (no login required)
- Use **L1 CDK constructs** (`CfnIdentityPool` + `CfnIdentityPoolRoleAttachment`) — the L2 `IdentityPool` construct is in alpha and unstable. L1 is always stable in `aws-cdk-lib`.
- Unauthenticated IAM role (`LengleUnauthRole`) allows:
  - `s3:GetObject` on `arn:aws:s3:::${bucket.bucketName}/data/*`
  - `s3:PutObject` on `arn:aws:s3:::${bucket.bucketName}/data/*`
  - `s3:ListBucket` on `arn:aws:s3:::${bucket.bucketName}` with a condition: `s3:prefix` starts with `data/` — **required for `ListObjectsV2`** which is used by Word History and results finalisation. Without this permission, both features will fail with a 403.
- No authenticated role needed

#### CDK Outputs (used in `.env.local` and `deploy.sh`)
The stack must output the following values after `cdk deploy`:
- `BucketName` — S3 bucket name
- `WebsiteUrl` — S3 static website endpoint (e.g. `http://lengle-bucket.s3-website-ap-southeast-2.amazonaws.com`)
- `IdentityPoolId` — Cognito identity pool ID

### 4.2 CDK Commands

```bash
# First-time setup (once per AWS account/region)
cd infra
npm install
npx cdk bootstrap aws://ACCOUNT_ID/ap-southeast-2

# Deploy all resources
npx cdk deploy --outputs-file ../cdk-outputs.json

# Destroy all resources (WARNING: deletes all data)
npx cdk destroy
```

### 4.3 Post-MVP: CloudFront + Custom Domain

Adding CloudFront restores HTTPS and enables a custom domain. This is gated behind a flag in `cdk.json`:
```json
{
  "context": {
    "cloudfront": {
      "enabled": false,
      "customDomain": {
        "enabled": false,
        "domainName": "lengle.yourdomain.com",
        "hostedZoneId": ""
      }
    }
  }
}
```

When `cloudfront.enabled: true`, the CDK stack additionally provisions:
1. CloudFront distribution with OAC origin pointing to the S3 bucket
2. S3 bucket policy updated to allow only CloudFront OAC (removes the public `GetObject` policy)
3. Custom error responses: 403 → `index.html` HTTP 200, 404 → `index.html` HTTP 200

When `customDomain.enabled: true`, also provisions:
1. ACM certificate in `us-east-1` using `Certificate` with `CertificateValidation.fromDns()`
2. CloudFront alias record in Route 53

---

## 5. Data Architecture

### 5.1 S3 Folder Structure

```
s3://lengle-bucket/
├── index.html                        ← React app entry (no-cache)
├── assets/                           ← Vite-hashed JS/CSS bundles (long-cache)
└── data/
    ├── players.json                  ← Player registry (read-only at runtime)
    ├── days/
    │   └── {YYYY-MM-DD}/
    │       ├── status.json           ← Lobby state: which players have set words
    │       ├── guesses-{player-id}.json  ← Per-player guess file (one per guesser)
    │       └── results.json          ← Daily results (written at day close)
    └── words/
        └── {YYYY-MM-DD}/
            └── {setter-id}.json      ← The puzzle word (never fetched until solved)
```

> **Note on app file location:** Vite builds to a root-relative structure. The `index.html` and `assets/` folder are uploaded to the **root** of the S3 bucket (not `/app/`). The `vite.config.ts` must set `base: '/'`. The deploy script syncs `app/dist/` to `s3://lengle-bucket/` (root), and game data lives under `data/`. The deploy script uses `--exclude 'data/*'` to never touch game data.

### 5.2 Word Security (Option B — Delayed Reveal)

The `/data/words/{date}/{setter-id}.json` files contain the actual puzzle words. The app enforces the following client-side access discipline:

- The app **never fetches** a word file for the current active puzzle date unless the player has a recorded correct guess (`is_correct: true`) in their own guess file for that puzzle
- Word files for **past days** (dates before the active puzzle date) are freely readable and used for Word History
- There is no server-side enforcement — the discipline is implemented in `src/lib/s3.ts` and must never be bypassed

### 5.3 Concurrency Strategy — Per-Player Guess Files

To eliminate write collisions on guess data, **each player has their own guess file per day**:

- `data/days/{date}/guesses-{player-id}.json` — contains only that player's guesses
- A player only ever writes to their own guess file — no read-modify-write race condition is possible
- When reading other players' guesses for the social feed, the app reads all three `guesses-{player-id}.json` files independently

This completely eliminates the concurrent write problem described in naive single-file approaches.

**Post-solve re-fetch (AC-11):** Immediately after a player records a correct guess (`is_correct: true`), `PuzzlePanel` must re-read the other players' guess files for that puzzle. This is required because AC-11 states that full guess history becomes mutually visible once both players have solved — the re-fetch ensures any additional rows from other solved players appear without a manual refresh.

### 5.4 Concurrency Strategy — Status File

The `status.json` file tracks which players have set their word. Each player writes to it only once (when setting their word). The write sets a single boolean field. Because each player writes exactly once and writes are idempotent (setting `true` twice is harmless), last-write-wins is safe here.

### 5.5 Word History — No Append-Only File

To avoid race conditions on a shared `word-history.json` file, there is **no global word history file**. Instead:

- Word history is **derived at read time** by scanning `data/words/{YYYY-MM-DD}/{setter-id}.json` for all past dates
- The app fetches the word files for each past date when the Word History screen is opened
- Fetching is done in parallel for all past dates
- Today's word files are excluded (not fetched) until the active puzzle date has advanced past that date
- The list of known past dates is derived from the `data/days/` prefix listing (S3 `ListObjectsV2`)

> **Known limitation — tomorrow's word uniqueness:** The uniqueness check for puzzle words only validates against past days (dates before the active puzzle date). The app cannot see other players' submitted words for a future date by design (word security). This means two players could theoretically submit the same word for the same future date. This is an accepted limitation for v1 given the game's private, trust-based nature.

### 5.6 Day Transition & Results Finalisation

There is no backend to trigger daily results. Instead:

- On every app mount, call `getPreviousPuzzleDate()` and check whether `data/days/{previous-date}/results.json` exists via `readJson()`
- If it does not exist, read all three `guesses-{player-id}.json` files for the previous date, compute results, and write `data/days/{previous-date}/results.json`
- This write is idempotent — if two players trigger it simultaneously, the computed result is identical and last-write-wins is safe
- Results are computed purely from guess files — no other state is needed
- If `guesses-{player-id}.json` does not exist for a given player on the previous date, that player solved 0 puzzles that day (treated as no participation)

> **Implementation note:** Check specifically `getPreviousPuzzleDate()` rather than scanning for the most recent results file. This is simpler, cheaper (one read instead of a list operation), and covers AC-20 correctly.

### 5.7 Polling Strategy

The lobby must detect when other players submit their words without a page refresh:

- Poll interval: **30 seconds** while the lobby is in State B (current player has set word, others pending)
- Polling target: `data/days/{date}/status.json` via `readJson()`
- Polling stops immediately when `status.unlocked === true`
- Polling does not occur on the puzzle view, leaderboard, or word history screens
- Implement polling using `setInterval` inside a `useEffect` hook, cleared on component unmount

### 5.8 JSON Schemas

#### `data/players.json` (bootstrap)
```json
{
  "players": [
    { "id": "player_1", "name": "Troy" },
    { "id": "player_2", "name": "Mum" },
    { "id": "player_3", "name": "Dad" }
  ]
}
```

#### `data/players/profiles.json` (emoji preferences)
```json
{
  "player_1": "🎯",
  "player_2": "🌸",
  "player_3": "⚡"
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

#### `data/days/{date}/guesses-{player-id}.json`
```json
{
  "date": "2026-03-30",
  "guesser_id": "player_2",
  "guesses": [
    {
      "puzzle_setter_id": "player_1",
      "guess_number": 1,
      "word": "STARE",
      "per_letter_scores": [3, 0, 1, 3, 1],
      "score": 8,
      "is_correct": false,
      "submitted_at": "2026-03-30T09:22:00.000Z"
    },
    {
      "puzzle_setter_id": "player_1",
      "guess_number": 2,
      "word": "CRANE",
      "per_letter_scores": [0, 0, 0, 0, 0],
      "score": 0,
      "is_correct": true,
      "submitted_at": "2026-03-30T09:25:00.000Z"
    }
  ]
}
```

#### `data/days/{date}/results.json`
```json
{
  "date": "2026-03-30",
  "finalised_at": "2026-03-31T04:03:00.000Z",
  "player_results": [
    {
      "player_id": "player_2",
      "total_guesses": 5,
      "puzzles_solved": 2,
      "is_daily_winner": true
    }
  ],
  "puzzle_winners": [
    {
      "setter_id": "player_1",
      "winner_ids": ["player_2"],
      "winning_guess_count": 2
    }
  ]
}
```

---

## 6. Frontend Application

### 6.1 Vite Configuration (`app/vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig({
  plugins: [react()],
  base: '/',  // CRITICAL: must be '/' for correct asset paths when served from S3 root
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),  // Exposes version from package.json
  },
})
```

Declare the global in `src/vite-env.d.ts`:
```typescript
declare const __APP_VERSION__: string
```

### 6.2 Configuration (`src/lib/config.ts`)

All tuneable values are centralised here. **Never hardcode player names, IDs, or scoring values outside this file.**

`CONFIG` (as const) holds players, scoring, timing, and AWS config.

`PRESET_EMOJIS` is a top-level export (NOT inside `CONFIG`) containing ~80 preset emojis for the emoji picker. This is exported separately because it does not need `as const` and is only needed by UI components.

### 6.3 Scoring Logic (`src/lib/scoring.ts`)

```typescript
import { CONFIG } from './config'

type LetterScore = 0 | 1 | 3

export interface GuessResult {
  perLetter: LetterScore[]
  total: number
  isCorrect: boolean
}

// Scores a 5-letter guess against a 5-letter target.
// Implements duplicate letter handling: correct position (+0) takes priority,
// then correct letter wrong position (+1), remaining duplicates score +3.
export function scoreGuess(guess: string, target: string): GuessResult
```

### 6.4 Date Logic (`src/lib/date.ts`)

```typescript
// Returns the active puzzle date string (YYYY-MM-DD) accounting for 4am reset.
// At 3:59am April 2, returns "2026-04-01". At 4:00am April 2, returns "2026-04-02".
export function getActivePuzzleDate(): string

// Returns the previous puzzle date string (YYYY-MM-DD)
export function getPreviousPuzzleDate(): string

// Returns true if the given date string is before the current active puzzle date
export function isPastDate(date: string): boolean
```

### 6.5 S3 Helpers (`src/lib/s3.ts`)

All S3 operations must go through this module. Components and hooks must never import the AWS SDK directly.

```typescript
// Read a JSON file from the S3 website endpoint (HTTP GET).
// Returns null if the file does not exist (404) or if the response
// Content-Type is not application/json (e.g. the S3 error document HTML).
export async function readJson<T>(key: string): Promise<T | null>

// Write a JSON file directly to S3 via AWS SDK with Cognito credentials (PUT).
export async function writeToS3(key: string, data: unknown): Promise<void>

// List all keys under a given prefix directly from S3 via AWS SDK with Cognito credentials.
// Uses ListObjectsV2 — requires s3:ListBucket IAM permission on the bucket (see §4.1).
// Returns full key strings (e.g. 'data/days/2026-04-01/status.json').
export async function listS3Keys(prefix: string): Promise<string[]>
```

> **Read vs Write routing:** All reads use `readJson()` (HTTP GET to the S3 website URL constructed as `${CONFIG.aws.s3WebsiteUrl}/${key}`). All writes and list operations use the AWS SDK directly with Cognito credentials. `listS3Keys` uses the SDK — the S3 website endpoint does not support list operations.

### 6.6 Component Structure

```
src/components/
├── PlayerSelect/
│   └── PlayerSelect.tsx
├── Lobby/
│   ├── Lobby.tsx                ← Home page (renamed from Lobby in v1.7)
│   ├── WordSetForm.tsx
│   └── PlayerStatusList.tsx     ← Word submission status table (today + tomorrow per player)
├── Puzzles/
│   ├── PuzzleView.tsx
│   ├── PuzzlePanel.tsx
│   ├── PracticeView.tsx         ← New in v1.7: client-side practice mode, route /practice
│   ├── GuessList.tsx            ← Owns overrides state; shows Reset Tiles button; emits onOverridesChange
│   ├── GuessRow.tsx             ← Accepts overrides/onOverrideChange props; per-letter dots
│   ├── tileOverride.ts          ← TileOverride type and TILE_CYCLE constant
│   ├── GuessInput.tsx           ← Controlled component: value + onValueChange props (v1.11)
│   ├── OnScreenKeyboard.tsx     ← New in v1.11: QWERTY keyboard with colour-coded letter keys
│   └── OthersPanel.tsx
├── Leaderboard/
│   ├── Leaderboard.tsx
│   ├── TodayTab.tsx             ← Daily Scores first; per-puzzle with tile reveal; GreyQuestionTile for unsolved
│   └── AllTimeTab.tsx           ← Completed-day count + new scoring model (v1.7)
├── WordHistory/
│   ├── WordHistory.tsx
│   └── DayEntry.tsx             ← Exports WordHistoryDay; accordion item with GreyQuestionTile for incomplete
└── shared/
    ├── Header.tsx               ← Shows LENGLE as green letter tiles when on /lobby; page label otherwise
    └── Nav.tsx
```

**Route inventory (as of v1.7):**
| Path | Component | Notes |
|---|---|---|
| `/` | `PlayerSelect` | Public, no auth required |
| `/lobby` | `Lobby` | Home page (protected) |
| `/play` | `PuzzleView` | Protected |
| `/practice` | `PracticeView` | Protected; client-side only, no S3 writes |
| `/leaderboard` | `Leaderboard` | Protected |
| `/history` | `WordHistory` | Protected |

**Page title convention:** Pages do not render their own `<h1>` title element. The persistent `Header` shows the current page name as the centred label in the navbar. The Nav dropdown uses the same name for each route. The canonical name for each page is defined in `PAGE_LABELS` in `Header.tsx` (and mirrored in `NAV_LINKS` in `Nav.tsx`). This avoids redundant titles and keeps the UI clean on small screens.

**`OnScreenKeyboard` component (v1.11):**
- Props: `onLetterPress(letter)`, `onBackspace()`, `disabled`, `guesses: GuessEntry[]`, `overrides: (TileOverride | null)[][]`
- Computes a `KeyColor` (`'default' | 'green' | 'orange' | 'grey' | 'red'`) for each letter via `computeKeyColor`, memoised on `guesses` and `overrides`
- A key is coloured only when ALL tiles for that letter are annotated and agree; any default (null) tile keeps the key default; all-annotated but disagreeing tiles renders the key red
- Red-key conflict note is rendered only when at least one key is red
- Uses `onPointerDown` with `preventDefault()` to prevent the on-screen key press from stealing focus from the guess input field
- Shown only when the puzzle is active (same condition as `GuessInput`)

**`GuessInput` props (v1.11):** Now a controlled component. Receives `value: string` and `onValueChange: (v: string) => void` from the parent. Internal `useState` for value removed.

**`GuessList` props (v1.11):** New optional `onOverridesChange?: (overrides: (TileOverride | null)[][]) => void` prop. Called via `useEffect` whenever overrides state changes, allowing parents (`PuzzlePanel`) to track live override state for keyboard key colouring.

**Player context:** `PlayerContext` is defined in `App.tsx` and exported. It provides:
- `playerId: string | null` — the currently selected player ID
- `setPlayerId` — persists the selection
- `playerEmojis: Record<string, string>` — map of player ID to currently active emoji (initialized from `config.ts` `defaultEmoji` values; overridden by `data/players/profiles.json` when loaded)
- `setPlayerEmoji(playerId, emoji)` — updates state and writes the updated map to S3 at `data/players/profiles.json`

All components that need the current player or emoji data must consume this context via the `usePlayer()` hook — do not prop-drill these values through component trees.

### 6.7 TypeScript Interfaces (`src/types/index.ts`)

```typescript
export interface Player {
  id: string
  name: string
}

export interface PuzzleWord {
  date: string
  setter_id: string
  word: string
  submitted_at: string
}

export interface DayStatus {
  date: string
  words_set: Record<string, boolean>
  unlocked: boolean
}

export interface GuessEntry {
  puzzle_setter_id: string
  guess_number: number
  word: string
  per_letter_scores: number[]
  score: number
  is_correct: boolean
  submitted_at: string
}

export interface PlayerGuesses {
  date: string
  guesser_id: string
  guesses: GuessEntry[]
}

export interface PuzzleWinner {
  setter_id: string
  winner_ids: string[]
  winning_guess_count: number
}

export interface PlayerResult {
  player_id: string
  total_guesses: number
  puzzles_solved: number
  is_daily_winner: boolean
}

export interface DayResults {
  date: string
  finalised_at: string
  player_results: PlayerResult[]
  puzzle_winners: PuzzleWinner[]
}
```

### 6.8 Routing

Client-side routing via React Router v6:

| Path | Component |
|---|---|
| `/` | PlayerSelect |
| `/lobby` | Lobby |
| `/play` | PuzzleView |
| `/practice` | PracticeView |
| `/leaderboard` | Leaderboard |
| `/history` | WordHistory |

S3 static website hosting is configured with `index.html` as both the index and error document. This means any unknown path returns `index.html`, which React Router handles for client-side routing.

### 6.9 localStorage Usage

| Key | Value | Purpose |
|---|---|---|
| `lengle_player_id` | `"player_1"` | Remembers last selected player |

---

## 7. Deployment

### 7.1 Deploy Script (`scripts/deploy.sh`)

```bash
#!/bin/bash
set -e

# Required env vars — set these from CDK outputs before running
: "${BUCKET_NAME:?BUCKET_NAME is required}"

echo "Building React app..."
cd app && npm run build && cd ..

echo "Uploading app to S3 root (excluding data/)..."
aws s3 sync app/dist/ s3://$BUCKET_NAME/ \
  --delete \
  --exclude "data/*" \
  --cache-control "public, max-age=31536000, immutable"

# index.html must not be cached — browsers must always fetch the latest version
aws s3 cp app/dist/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "Deploy complete ✅"
echo "Live URL: check cdk-outputs.json for WebsiteUrl"
```

### 7.2 Environment Variables

**Shell / `scripts/deploy.sh`:**

| Variable | Source | Description |
|---|---|---|
| `BUCKET_NAME` | CDK output `BucketName` | S3 bucket name |

**App / `app/.env.local`** (never committed to git):

| Variable | Source | Description |
|---|---|---|
| `VITE_S3_BUCKET_NAME` | CDK output `BucketName` | S3 bucket for direct writes |
| `VITE_S3_WEBSITE_URL` | CDK output `WebsiteUrl` | S3 website endpoint for reads |
| `VITE_COGNITO_IDENTITY_POOL_ID` | CDK output `IdentityPoolId` | Cognito pool for credentials |

Add `app/.env.local` to `.gitignore`.

### 7.3 Data Preservation on Deploy

- The deploy script syncs `app/dist/` to the S3 root with `--exclude 'data/*'`
- Game data under `data/` is **never touched** by the deploy script
- S3 versioning is enabled — all previous versions of data files are retained and recoverable via the AWS console or CLI

### 7.4 First-Time Data Bootstrap

On first deploy, the following files must be manually created in S3 (or via a bootstrap script):

```bash
# Upload the players registry
aws s3 cp players.json s3://$BUCKET_NAME/data/players.json
```

The `players.json` content is derived from `CONFIG.players` in `config.ts`.

---

## 8. GitHub Copilot Integration

### 8.1 Release Workflow

All changes ship through a named `release/vX.Y` branch (major + minor only, no patch versions). The `@release-agent` custom agent manages the full lifecycle:

| Phase | Who | What |
|---|---|---|
| Plan | Release Agent | Creates branch, interviews user, researches codebase, writes `plans/release-vX.Y.md` |
| Implement | User in Agent mode | Makes all code changes following the plan |
| Verify + Deploy | Release Agent (on demand) | Runs `typecheck` + `lint`, runs `scripts/deploy.sh` |
| Close | Release Agent | Commits, pushes release branch, squash-merges to `main` |

**Standard commit message format:**
```
vX.Y: One liner summary of the release

- Change description 1
- Change description 2
- Change description 3
```

Plan documents live at `plans/release-vX.Y.md`. One per release.

### 8.2 Release Agent (`.github/agents/release-agent.agent.md`)

The release agent has three routines:

- **Start Release** — validates version (`vX.Y`), checks for unmerged previous releases (warns + offers to close first), creates the `release/vX.Y` branch, interviews user about changes, uses the `Explore` subagent to research codebase impact, writes the plan document.
- **Active Release Coordinator** — runs `typecheck` + `lint` on demand, runs `scripts/deploy.sh` with pre-deploy checks, answers spec/architecture questions, summarises open plan items.
- **Close Release** — confirms with user, runs final checks (aborts if they fail), builds the commit message (one-liner + bullet list confirmed with user), commits on the release branch, pushes, squash-merges to `main`, updates plan status to Done.

### 8.3 Repository-Level Instructions (`.github/copilot-instructions.md`)

```markdown
# Lengle — Copilot Repository Instructions

## About this project
Lengle is a private family word puzzle game built as a static React (Vite + TypeScript + Tailwind CSS)
app hosted on AWS S3 static website hosting. All game data is stored as JSON files in S3.
There is no backend API, no database, and no server.

## Architecture rules — never violate these
- All S3 reads go through `src/lib/s3.ts → readJson()` (HTTP GET to S3 website URL)
- All S3 writes go through `src/lib/s3.ts → writeToS3()` (PUT directly to S3 via Cognito credentials)
- All S3 list operations go through `src/lib/s3.ts → listS3Keys()` (directly to S3 via Cognito credentials)
- Never use the AWS SDK for reads — use `readJson()` with plain fetch instead
- Never import the AWS SDK directly in components or hooks — always use src/lib/s3.ts
- All scoring constants come from CONFIG.scoring in src/lib/config.ts — never hardcode +0/+1/+3
- All date/reset logic goes through src/lib/date.ts
- Player names and IDs are defined only in CONFIG.players in src/lib/config.ts
- Player ID is shared app-wide via PlayerContext defined in App.tsx — never prop-drill it
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
of specs/spec-game-design.md and/or specs/spec-implementation.md in the same commit as the code change.
```

### 8.4 Game Change Prompt (`.github/prompts/update-game.prompt.md`)

````markdown
# Copilot Prompt: Update Game

Use this prompt when making any change to Lengle's game behaviour, UI, or configuration.

## Steps

1. Read `specs/spec-game-design.md` and `specs/spec-implementation.md` in full
2. Identify which acceptance criteria and spec sections are affected
3. Make the code change, following all conventions in `.github/copilot-instructions.md`
4. Update the affected spec sections
5. Run `cd app && npm run typecheck && npm run lint` and fix all errors
6. Summarise: what changed in code, which spec sections were updated, which ACs are affected

## Change requested

[DESCRIBE YOUR CHANGE HERE]
````

### 8.5 Deploy Prompt (`.github/prompts/deploy.prompt.md`)

````markdown
# Copilot Prompt: Deploy to Production

Use this prompt to deploy the current state of Lengle to production.

## Pre-deploy checks (run these first)

1. `cd app && npm run typecheck` — must pass with zero errors
2. `cd app && npm run lint` — must pass with zero errors
3. Confirm `app/.env.local` exists with all three VITE_ variables set
4. Confirm shell env has BUCKET_NAME set

## Deploy

5. Run `bash scripts/deploy.sh`
6. Report the live URL from the CDK output `WebsiteUrl`

## Post-deploy

8. Open the live URL and confirm the app loads correctly
9. Report any errors encountered
````

---

## 9. README Structure

The `README.md` must cover the following sections in order:

1. **What is Lengle** — one paragraph
2. **Prerequisites** — Node.js 18+, AWS CLI v2, CDK CLI v2, an AWS account, configured AWS credentials
3. **First-time setup** — clone repo, `npm install` in both `app/` and `infra/`
4. **Deploy infrastructure** — `cdk bootstrap`, `cdk deploy --outputs-file ../cdk-outputs.json`, how to read the outputs
5. **Configure environment variables** — create `app/.env.local` from CDK outputs, set shell vars for deploy script
6. **Bootstrap game data** — upload initial `players.json` to S3
7. **Deploy the app** — `bash scripts/deploy.sh`
8. **Update CORS after first deploy** — update S3 CORS `AllowedOrigins` to specific S3 website endpoint, redeploy infra
9. **Adding or renaming players** — edit `CONFIG.players` in `config.ts`, update `players.json` in S3, redeploy app
10. **Tuning scoring values** — edit `CONFIG.scoring` in `config.ts`, redeploy app
11. **Adding CloudFront + custom domain (post-MVP)** — set `cloudfront.enabled: true` in `cdk.json`, optionally set `customDomain.enabled: true`, run `cdk deploy`
12. **Recovering data** — how to use S3 versioning to restore a previous version of a data file via AWS CLI
13. **Troubleshooting** — CORS errors (check AllowedOrigins), blank page (check Vite base config and S3 static website enabled), Cognito credential errors (check identity pool ID)

---

## 10. Cost Estimate

At 3 players with typical daily usage (Sydney region):

| Service | Expected monthly cost |
|---|---|
| S3 storage (app + data) | < $0.01 |
| S3 requests (reads + writes) | < $0.01 |
| Cognito Identity Pool | Free (always-free tier) |
| **Total** | **< $1.00/month** |

---

## 11. Post-MVP Improvements (Not in Scope for v1)

- CloudFront + custom domain + HTTPS via Route 53 + ACM (gated behind `cloudfront.enabled` flag in `cdk.json`)
- GitHub Actions automated deploy on push to `main`
- Push notifications via SNS/SES when all words are set for the day
- Admin view for manually correcting bad data in S3
- Automated daily word suggestions