# Lengle

Lengle is a private daily word puzzle game for a family of three. It runs as a static React app hosted on AWS S3, with all game state stored as JSON in S3. There is no backend API, database, or server.

## Architecture at a glance

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Hosting: AWS S3 static website hosting
- Data store: JSON files in S3 under `data/`
- Infrastructure: AWS CDK v2
- Environments: `prod` and `nonprod`, provisioned from the same CDK stack
- Agent workflow: single-chat orchestrator plus five domain agents

## Environment model

The repo now has two deployed environments:

- `prod`: the live family game
- `nonprod`: the safe test environment used during releases

Both buckets are provisioned by the same CDK stack and share a single unauthenticated Cognito identity pool. `cdk-outputs.json` contains the bucket names, website URLs, and shared identity pool ID.

Generate build env files with:

```bash
cd app && npm run env:setup
```

This writes:

- `app/.env.prod`
- `app/.env.nonprod`

Use `app/.env.local` only for local `npm run dev` work.

## Agent workflow

Use `@orchestrator` as the default entry point. The orchestrator reads git state and plan state, then routes work to the correct domain agent.

Agents:

- `@orchestrator`: single-chat router and workflow chainer
- `@plan-agent`: writes `plans/draft.md` with overview, acceptance criteria, and user testing
- `@design-agent`: appends technical implementation, technical verification, and decisions; updates specs
- `@build-agent`: implements the active release plan and fixes typecheck/lint errors
- `@release-agent`: creates release branches, owns non-prod deploys, manages WIP commits, closes releases
- `@production-agent`: tags releases, deploys to prod, handles backups, restores, rollback, and cleanup

Reusable standards live in `.github/skills/`.

For the conversational routing model used in Paseo and Copilot CLI, see `paseo-copilot-cli-setup.md`.

## Release flow

1. On `main`, ask `@orchestrator` to plan the change. This routes to Plan Agent and creates `plans/draft.md`.
2. Ask `@orchestrator` to design it. This routes to Design Agent, which updates specs and appends the technical plan.
3. Ask `@orchestrator` to start the release. This routes to Release Agent, which creates `release/vX.Y`, renames the plan, and syncs prod data to non-prod.
4. Ask `@orchestrator` to implement it. This routes to Build Agent, which resumes from the first incomplete phase and validates with `npm run typecheck && npm run lint`.
5. After implementation, Release Agent deploys to non-prod with `bash scripts/deploy.sh nonprod` and creates a WIP commit.
6. When testing is complete, ask `@orchestrator` to close the release. Release Agent performs the squash merge to `main`.
7. Ask `@orchestrator` to deploy to production. Production Agent tags the release, backs up prod data, and deploys with `bash scripts/deploy.sh prod`.

Hotfixes use `hotfix/vX.Y.Z` branches and follow the same Plan -> Design -> Build -> Release -> Production pattern.

## Local development

Prerequisites:

- Node.js 18+
- AWS CLI v2

Install dependencies:

```bash
cd app && npm install
cd ../infra && npm install
```

For local app development, copy `app/.env.local.example` to `app/.env.local` and point it at the environment you want to talk to. Non-prod is the safe default.

Run the app:

```bash
cd app && npm run dev
```

Validate before handing work back to the release flow:

```bash
cd app && npm run typecheck && npm run lint
```

## Infrastructure and deploy scripts

Deploy the stack and refresh local env files:

```bash
cd infra && npx cdk deploy --outputs-file ../cdk-outputs.json
cd ../app && npm run env:setup
```

Deploy the app:

```bash
bash scripts/deploy.sh nonprod
bash scripts/deploy.sh prod
```

Other operational scripts:

- `bash scripts/backup-data.sh prod`
- `bash scripts/backup-data.sh nonprod`
- `bash scripts/restore-data.sh backups/<timestamp> prod`
- `bash scripts/delete-data.sh nonprod`
- `bash scripts/sync-data-to-nonprod.sh`

The operational scripts include AWS auth preflight. They resolve profile context in this order: `AWS_PROFILE`, `LENGLE_AWS_PROFILE`, `lengle`, then `default`. If a resolved SSO profile is expired, they attempt `aws sso login --profile <profile>` automatically.

## Key references

- `specs/spec-game-design.md`
- `specs/spec-implementation.md`
- `specs/spec-ux-design.md`
- `.github/copilot-instructions.md`
- `plans/`
