# Lengle — Implementation Specification

> Version 1.13 — This document defines the technical architecture, infrastructure, environments, and agentic workflow for Lengle. Behaviour rules remain in `spec-game-design.md`.

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Hosting | AWS S3 static website hosting |
| Data store | AWS S3 JSON files |
| Infrastructure as Code | AWS CDK v2 |
| AWS Region | `ap-southeast-2` |
| Release workflow | Copilot agents + manual AWS CLI/CDK commands |

---

## 2. Runtime Architecture

Lengle is fully client-side. The browser loads the React bundle from S3 website hosting and reads or writes JSON data directly against S3.

- Reads use `fetch()` against the S3 website URL
- Writes use the AWS SDK through `app/src/lib/s3.ts`
- List operations use the AWS SDK through `app/src/lib/s3.ts`
- There is no backend API, no Lambda, and no database

Core rules:

- All reads go through `readJson()` in `app/src/lib/s3.ts`
- All writes go through `writeToS3()` in `app/src/lib/s3.ts`
- All list operations go through `listS3Keys()` in `app/src/lib/s3.ts`
- Components and hooks must not import AWS SDK clients directly

---

## 3. Environment Architecture

### 3.1 Environments

Lengle has two deployed environments:

| Environment | Purpose | CDK outputs |
|---|---|---|
| `prod` | Live family game | `BucketName`, `WebsiteUrl` |
| `nonprod` | Safe release testing | `NonProdBucketName`, `NonProdWebsiteUrl` |

Both environments share the same Cognito unauthenticated identity pool, exposed as `IdentityPoolId`.

### 3.2 Env files

| File | Purpose |
|---|---|
| `app/.env.prod` | Generated production build env |
| `app/.env.nonprod` | Generated non-prod build env |
| `app/.env.local` | Local-only `npm run dev` env |
| `app/.env.local.example` | Local-dev guidance template |
| `app/.env.nonprod.example` | Small non-prod template example |

Generate the build env files with:

```bash
cd app && npm run env:setup
```

This reads `../cdk-outputs.json` and writes `app/.env.prod` and `app/.env.nonprod`.

### 3.3 Vite modes

- `npx vite build --mode prod` loads `app/.env.prod`
- `npx vite build --mode nonprod` loads `app/.env.nonprod`
- `npm run dev` uses `app/.env.local`

---

## 4. Repository Structure

```text
lengle/
├── .github/
│   ├── agents/
│   │   ├── orchestrator.agent.md
│   │   ├── plan-agent.agent.md
│   │   ├── design-agent.agent.md
│   │   ├── build-agent.agent.md
│   │   ├── release-agent.agent.md
│   │   └── production-agent.agent.md
│   ├── skills/
│   │   ├── git-standards/SKILL.md
│   │   ├── deployment/SKILL.md
│   │   ├── environments/SKILL.md
│   │   ├── data-management/SKILL.md
│   │   └── code-standards/SKILL.md
│   └── copilot-instructions.md
├── app/
│   ├── src/
│   ├── .env.local.example
│   ├── .env.nonprod.example
│   └── package.json
├── infra/
│   └── lib/lengle-stack.ts
├── plans/
│   ├── draft.md
│   └── release-vX.Y.md
├── scripts/
│   ├── deploy.sh
│   ├── backup-data.sh
│   ├── restore-data.sh
│   ├── delete-data.sh
│   ├── sync-data-to-nonprod.sh
│   └── generate-env.mjs
└── specs/
    ├── spec-game-design.md
    ├── spec-implementation.md
    └── spec-ux-design.md
```

The old `.github/prompts/` workflow is retired. The agents own those responsibilities directly.

---

## 5. Infrastructure

### 5.1 CDK stack

`infra/lib/lengle-stack.ts` provisions:

- Production website bucket
- Non-production website bucket
- Shared Cognito identity pool
- Shared unauthenticated IAM role for both buckets

Each bucket:

- Enables static website hosting
- Uses `index.html` for both index and error documents
- Is versioned
- Allows public `s3:GetObject` for website hosting
- Allows CORS for `GET` and `PUT`

### 5.2 IAM permissions

The shared unauthenticated role allows:

- `s3:GetObject` on `data/*` in both buckets
- `s3:PutObject` on `data/*` in both buckets
- `s3:ListBucket` on both buckets with `s3:prefix` limited to `data/` and `data/*`

### 5.3 Outputs

`cdk-outputs.json` must include:

- `BucketName`
- `WebsiteUrl`
- `NonProdBucketName`
- `NonProdWebsiteUrl`
- `IdentityPoolId`

### 5.4 Standard commands

```bash
cd infra && npx cdk deploy --outputs-file ../cdk-outputs.json
cd infra && npx cdk synth
```

---

## 6. Data Architecture

### 6.1 S3 layout

```text
s3://<bucket>/
├── index.html
├── assets/
└── data/
    ├── players.json
    ├── players/profiles.json
    ├── days/{YYYY-MM-DD}/status.json
    ├── days/{YYYY-MM-DD}/guesses-{player-id}.json
    ├── days/{YYYY-MM-DD}/results.json
    └── words/{YYYY-MM-DD}/{setter-id}.json
```

### 6.2 Security and access discipline

- Current-day word files must not be fetched until the relevant player has solved the puzzle
- Past word files may be read for history views
- The app bundle is deployed to the bucket root; `data/` is never overwritten by app deploys

### 6.3 Concurrency

- Each player writes only to their own `guesses-{player-id}.json`
- `status.json` writes are idempotent and last-write-wins safe
- `results.json` finalisation is derived from guess files and is safe to recompute concurrently

### 6.4 Central config rules

- Scoring values come from `CONFIG.scoring`
- Date and reset rules go through `app/src/lib/date.ts`
- Player IDs, names, and default emoji definitions live in `CONFIG.players`
- Shared types live in `app/src/types/index.ts`

---

## 7. Frontend Conventions

### 7.1 Vite configuration

- `app/vite.config.ts` must keep `base: '/'`
- `__APP_VERSION__` is injected from `app/package.json`
- The package version must match the active release version

### 7.2 React conventions

- Player identity and emoji information are shared through `PlayerContext` in `app/src/App.tsx`
- Do not prop-drill player IDs or emoji maps
- Follow `specs/spec-ux-design.md` for all UI patterns and button styles

### 7.3 TypeScript

- Strict mode is mandatory
- `any` is not allowed
- All new shared interfaces belong in `app/src/types/index.ts`

---

## 8. Agentic Workflow

### 8.1 Agent set

Lengle uses six agents:

| Agent | Responsibility |
|---|---|
| Orchestrator | Single-chat router and workflow chainer |
| Plan Agent | Requirements, acceptance criteria, user testing |
| Design Agent | Technical plan, spec updates, implementation phases |
| Build Agent | Code implementation and validation |
| Release Agent | Release branch lifecycle and non-prod environment |
| Production Agent | Tags, prod deploys, prod backups, rollback |

### 8.2 Skills

Reusable repo standards live in `.github/skills/`:

- `git-standards`
- `deployment`
- `environments`
- `data-management`
- `code-standards`

### 8.3 Orchestrator routing

The orchestrator checks:

1. Current git branch
2. Whether `plans/draft.md` exists
3. Whether the matching `plans/release-vX.Y.md` exists on a release branch

Routing rules:

- On `main` without `plans/draft.md`: planning requests go to Plan Agent
- On `main` with a draft but no technical section: design requests go to Design Agent
- On `main` with a fully designed draft: release-start requests go to Release Agent
- On `release/vX.Y` or `hotfix/vX.Y.Z`: implementation goes to Build Agent
- On `release/vX.Y` or `hotfix/vX.Y.Z`: deployment-for-testing and close-release go to Release Agent
- On any branch: production operations go to Production Agent

### 8.4 Plan ownership model

- Plan Agent owns Overview, Acceptance Criteria, and User Testing
- Design Agent owns Technical Implementation, Technical Verification, and Decisions & Scope
- Build Agent executes the plan rather than redesigning it

### 8.5 Release flow

Standard release:

1. Plan Agent writes `plans/draft.md`
2. Design Agent appends the technical plan and updates specs
3. Release Agent creates `release/vX.Y`, renames the plan, and syncs prod data to non-prod
4. Build Agent implements the plan and validates `typecheck` + `lint`
5. Release Agent deploys to non-prod and creates a WIP commit
6. Release Agent closes the release with a squash merge to `main`
7. Production Agent tags the release, backs up prod, and deploys to prod

Hotfixes follow the same flow but use `hotfix/vX.Y.Z` branches and patch-version tags.

### 8.6 Rollback

Emergency rollback is a Production Agent operation:

- Find the previous release tag
- Rebuild that tagged revision in prod mode
- Deploy it without altering git history
- Return to `main`

---

## 9. Operational Scripts

| Script | Purpose |
|---|---|
| `scripts/deploy.sh [prod|nonprod]` | Build and deploy the app to the chosen environment |
| `scripts/backup-data.sh [prod|nonprod]` | Back up the environment's `data/` prefix into `backups/` |
| `scripts/restore-data.sh <backup-dir> [prod|nonprod]` | Restore a backup into the chosen environment |
| `scripts/delete-data.sh <prod|nonprod>` | Delete the chosen environment's `data/` prefix |
| `scripts/sync-data-to-nonprod.sh` | Mirror prod `data/` into non-prod |
| `scripts/generate-env.mjs` | Generate `.env.prod` and `.env.nonprod` from `cdk-outputs.json` |

Rules:

- `deploy.sh` defaults to `nonprod`
- Production deploys require a tag and a backup first
- Delete operations require explicit confirmation at the agent layer and at least one existing backup folder

---

## 10. Source-of-Truth Files

- Behaviour: `specs/spec-game-design.md`
- Technical architecture: `specs/spec-implementation.md`
- UX rules: `specs/spec-ux-design.md`
- Repo routing and overview: `.github/copilot-instructions.md`
- Active implementation plan: `plans/draft.md` or `plans/release-vX.Y.md`
