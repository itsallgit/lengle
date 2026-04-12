# Release v1.13 — Agentic Architecture Overhaul & Non-Prod Environment

## Overview

| Field | Value |
|---|---|
| Release | v1.13 |
| Branch | release/v1.13 |
| Date | 2026-04-12 |
| Closed | 2026-04-13 |

### Summary
Complete restructuring of the project's agentic architecture and workspace management. Introduces a non-prod S3 environment for safe development testing, replaces the current 2 agents with 6 SDLC-aligned agents (orchestrator + 5 domain agents), externalises all standards and procedures into 5 reusable skills, redesigns the plan document template with additive ownership across agents, and establishes a strict tag-before-prod-deploy workflow with hotfix and emergency rollback support. Also includes Scores page UI improvements: a Puzzle Words summary section on the Today tab, a combined Guesses/Points grid with a full-width segmented toggle, and removal of the stale footer message.

### Changes included
- New non-prod S3 bucket added to CDK stack (same stack, second bucket + shared Cognito identity pool)
- 6 agents: Orchestrator (state-aware router) + Plan + Design + Build + Release + Production
- 5 skills: git-standards, deployment, environments, data-management, code-standards
- Architecture rules moved from `copilot-instructions.md` into the `code-standards` skill
- Deploy script parameterised for environment (`prod` / `nonprod`)
- New data sync script (prod → nonprod)
- New env file generation npm script (`npm run env:setup`)
- Separate `.env.prod` and `.env.nonprod` files using Vite `--mode`
- Git tagging on `main` after squash-merge, required before prod deploy
- Hotfix workflow via `hotfix/vX.Y.Z` branches with patch versioning
- Emergency rollback capability (redeploy previous tag without git changes)
- Auto-commit after each non-prod deploy
- Auto-sync prod data to non-prod at release branch creation
- Plan document template redesigned with additive sections owned by Plan, Design, and Build agents
- Release state inferred from git state + plan document structure (no manual status field)
- Existing `.github/prompts/` removed (responsibilities absorbed into agents)
- README, copilot-instructions, specs, and Paseo setup docs fully rewritten
- Scores page — Puzzle Words summary section added to the Today tab
- Scores page — Guesses/Points combined grid with full-width segmented toggle (replaces per-puzzle sections)
- Scores page — Removed "Updates as players complete puzzles throughout the day." footer message

---

## Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Git tagging | Annotated tag on `main` after squash-merge | Clean: one tag per release on the mainline |
| D2 | Non-prod data sync | Automatic at release branch creation | Every release starts with fresh prod data |
| D3 | CDK approach | Same stack, second bucket | Simpler: one deploy, shared Cognito pool |
| D4 | Iterative commits | Agent auto-commits WIP after each non-prod deploy | Changes always visible in git, even incomplete |
| D5 | Backup retention | Manual cleanup only | Agent lists backups with dates/sizes, user picks which to delete |
| D6 | Env switching | Separate `.env` files per environment (Vite `--mode`) | Build-time env isolation |
| D7 | Agent count | 5 domain agents + 1 orchestrator (6 total) | Clean SDLC separation: Plan → Design → Build → Release → Production |
| D8 | Orchestrator | State-aware thin router | Checks git branch + `plans/draft.md` to route contextually |
| D9 | Prod deploy | Require git tag before prod deploy | Enforces explicit version promotion |
| D10 | Existing prompts | Remove (absorbed into agents) | Agents own all responsibilities; prompts add confusion |
| D11 | Version numbering | Release Agent determines version from `git tag -l` | Plan Agent works versionless; Release Agent assigns version on branch creation |
| D12 | Draft plan location | `plans/draft.md` (single fixed file) | Renamed to `plans/release-vX.Y.md` by Release Agent |
| D13 | Local vs non-prod | Both: Build Agent starts localhost; Release Agent deploys to non-prod | Localhost for quick desktop iteration; non-prod for device/phone testing |
| D14 | Env file generation | `npm run env:setup` in `app/package.json` | Auto-generates `.env.prod` + `.env.nonprod` from `cdk-outputs.json` |
| D15 | Non-prod data cleanup | Abandoned — next release overwrites it | Next release start syncs fresh prod data |
| D16 | Planning vs release start | Separate: Plan Agent writes `plans/draft.md` first; Release Agent creates branch later | Planning can happen before any git branch exists |
| D17 | User interaction | Always natural language; orchestrator matches intent | Agnostic to interface (Paseo voice, CLI, VS Code Chat) |
| D18 | Plan Agent terminal | Yes — has terminal access for exploration | Needs to explore codebase to write good requirements |
| D19 | Design Agent tools | read + search + execute + edit + agent (Explore subagent) | Full exploration + plan editing |
| D20 | Build Agent review | Pure executor — no plan review, trusts Design Agent | No redundant validation; Design Agent owns technical correctness |
| D21 | Plan template | Additive — each agent owns specific sections | Plan → Overview + AC; Design → Technical Implementation; Build → executes |
| D22 | Architecture rules | Moved to `code-standards` skill | Full decoupling; `copilot-instructions.md` becomes lightweight project overview + routing |
| D23 | Spec updates | Design Agent updates specs during technical design phase | Specs evolve during design, not during implementation |
| D24 | Release state | Inferred from git state + plan doc structure | No manual status field; agents determine state from: branch name, which plan sections exist, git tags |
| D25 | Build Agent resumption | Re-reads plan and diffs against actual code to determine progress | No completion markers; real code state is the source of truth |
| D26 | Mid-release feedback | Release Agent triages: trivial → Build Agent directly; significant → Plan → Design → Build | Release Agent is the decision-maker for change size |
| D27 | Hotfix branches | `hotfix/vX.Y.Z` pattern (semver patch from latest tag) | Consistent workflow; user decides if non-prod testing needed per hotfix |
| D28 | Emergency rollback | Production Agent redeploys previous tag (no git changes) | Temporary escape hatch; permanent fix always via hotfix branch |
| D29 | Mandatory prod backup | Always backup before every prod deploy, no exceptions | Data safety is non-negotiable |
| D30 | Multi-step chaining | Orchestrator auto-chains across agents when intent is clear | "close the release and deploy to production" chains Release → Production |
| D31 | Agent autonomy | Agents proceed fully autonomously until they need user input | No unnecessary pauses between steps |
| D32 | Plan revision history | Overwrite plan to reflect current state | Git history tracks all changes; plan doc stays clean |
| D33 | Design conflicts | Design Agent surfaces conflicts with recommendations; user decides; decision reflected in spec update | Specs evolve organically based on user decisions |
| D34 | Parallel releases | One release at a time | Finish or close before starting the next |

---

## Roles & Responsibilities Matrix

| # | Responsibility | Owner Agent | Skills Used |
|---|---|---|---|
| R1 | Git branch management (create, checkout, naming) | **Release Agent** | git-standards |
| R2 | Requirements gathering & acceptance criteria | **Plan Agent** | — |
| R3 | Technical design, spec updates, implementation plan | **Design Agent** | code-standards |
| R4 | Code implementation | **Build Agent** | code-standards |
| R5 | Iterative WIP commits on release branches | **Release Agent** | git-standards |
| R6 | Deploy to non-prod for user testing | **Release Agent** | deployment, environments |
| R7 | Production data backups | **Production Agent** | data-management |
| R8 | Old backup cleanup | **Production Agent** | data-management |
| R9 | Sync prod data to non-prod | **Release Agent** | data-management, environments |
| R10 | Implement testing feedback (trivial changes) | **Build Agent** | code-standards |
| R11 | Verify build & provide non-prod URL for testing | **Release Agent** | deployment, environments |
| R12 | Close release (commit, squash-merge, branch cleanup) | **Release Agent** | git-standards |
| R13 | Tag release on main & deploy to production | **Production Agent** | git-standards, deployment, environments |
| R14 | Emergency production rollback | **Production Agent** | deployment, environments |
| R15 | Hotfix lifecycle (WIP commit on release, create hotfix branch, merge) | **Release Agent** | git-standards |
| R16 | Mid-release feedback triage (trivial vs significant) | **Release Agent** | — |

---

## Agent Architecture

### Orchestrator (`orchestrator.agent.md`)

**Role**: State-aware thin router. Determines project state from git and plan files, then delegates to the correct domain agent. Handles multi-step chaining when user intent spans multiple agents.

**Tools**: `agent`, `read`, `search`, `execute`

**State detection** (run on every interaction):
1. `git branch --show-current` → determines branch context
2. Check if `plans/draft.md` exists → determines planning state
3. Check if `plans/release-vX.Y.md` exists (matching current branch) → determines release state

**Routing rules**:
| Project State | User Intent | Routes To |
|---|---|---|
| On `main`, no `draft.md` | "I want to add..." / "plan..." / "new feature..." | Plan Agent |
| On `main`, `draft.md` exists (no Technical Implementation section) | "design it" / "work out the technical plan" | Design Agent |
| On `main`, `draft.md` exists (has Technical Implementation section) | "start the release" / "create the branch" | Release Agent |
| On `release/vX.Y` | "implement" / "build" / "code" / "fix..." | Build Agent |
| On `release/vX.Y` | "deploy for testing" / "commit progress" / "close the release" | Release Agent |
| On `release/vX.Y` | "the button is wrong" / testing feedback | Release Agent (triages size) |
| On `release/vX.Y` | "where were we?" / "what's the status?" | Release Agent (summarises state) |
| Any branch | "deploy to production" / "tag release" | Production Agent |
| Any branch | "backup" / "restore" / "clean up backups" | Production Agent |
| Any branch | "there's a bug in production" / "hotfix" | Release Agent (initiates hotfix) |
| Any branch | General Q&A about the project | Answer inline (read specs) |

**Multi-step chaining**: When user intent spans agents (e.g. "close the release and deploy to production"), the orchestrator chains the calls sequentially — Release Agent (close) → Production Agent (tag + deploy) — without requiring separate user commands.

**Auto-routing after Build Agent**: When the Build Agent reports "Implementation complete", the orchestrator automatically routes to the Release Agent for non-prod deploy without waiting for user input.

**Misrouting recovery**: If the user names a specific agent (e.g. "use the build agent"), the orchestrator honours the explicit request regardless of state-based routing.

---

### Plan Agent (`plan-agent.agent.md`)

**Role**: Requirements discovery. Interviews the user, understands what they want, defines user acceptance criteria and user-facing verification steps. Writes the "what" and "why" — never the "how".

**Tools**: `read`, `search`, `execute`, `edit`, `agent` (Explore subagent)

**Workflow**:
1. Use Explore subagent to understand the current codebase relevant to the user's request
2. Interview the user with clarifying questions to define the scope of the change
3. Write `plans/draft.md` with the following sections:
   - §Overview (Summary + Changes included)
   - §Acceptance Criteria (numbered table with user-facing criteria)
   - §Verification > User Testing (manual verification steps for ACs)
4. Present the draft for user review
5. Iterate until the user confirms the plan
6. On confirmation, report: "Plan confirmed. Say 'design it' to proceed to technical design."

**Section ownership** — Plan Agent writes:
- Overview (Summary, Changes included)
- Acceptance Criteria table
- Verification > User Testing

**Does NOT write**: Technical Implementation, Technical Verification, Decisions & Scope (those are Design Agent's sections)

**On new session**: Re-read `plans/draft.md` if it exists. Present a summary of the current plan state and ask if the user wants to continue refining or move to design.

---

### Design Agent (`design-agent.agent.md`)

**Role**: Technical architect. Takes confirmed acceptance criteria, researches the codebase in depth, identifies all affected files and patterns, surfaces conflicts with existing specs (with recommendations for user to decide), updates specs with user's decisions, and produces a detailed phased implementation plan. Writes the "how".

**Tools**: `read`, `search`, `execute`, `edit`, `agent` (Explore subagent)

**Workflow**:
1. Read the plan (`plans/draft.md` or `plans/release-vX.Y.md`)
2. Read all relevant specs: `specs/spec-game-design.md`, `specs/spec-implementation.md`, `specs/spec-ux-design.md`
3. Use Explore subagent to read all source files affected by the acceptance criteria
4. Critical review:
   - Validate AC feasibility against real code
   - Identify all files that need creation or modification
   - Identify TypeScript types that need updating
   - Surface any conflicts between ACs and existing spec conventions — present each conflict with a recommendation and let the user decide
5. Update spec files to reflect user decisions on conflicts
6. Append to the plan:
   - §Technical Implementation: phased steps with explicit file paths, function names, specific code changes
   - §Verification > Technical Verification: typecheck, lint, and specific automated checks
   - §Decisions & Scope: key assumptions, trade-offs, in/out of scope
7. Present the technical plan for user review
8. Iterate until confirmed

**Section ownership** — Design Agent writes:
- Technical Implementation (phased steps)
- Verification > Technical Verification
- Decisions & Scope

**Conflict handling**: When an AC conflicts with a UX or game design spec convention, the Design Agent:
1. Presents the conflict with a clear explanation
2. Provides a recommendation
3. Waits for the user's decision
4. Updates the relevant spec file to reflect the user's decision
5. Proceeds with the design based on the user's chosen direction

**On new session**: Re-read the plan. If Technical Implementation already exists, present a summary and ask if the user wants to revise or proceed to building.

---

### Build Agent (`build-agent.agent.md`)

**Role**: Pure executor. Reads the fully designed plan and implements all code changes. Does not review, question, or modify the plan. Trusts the Design Agent's output completely.

**Tools**: `read`, `search`, `edit`, `execute`, `todo`

**No git operations, no deployment.**

**Workflow**:
1. Read the plan (`plans/draft.md` or `plans/release-vX.Y.md`)
2. Determine progress: read each file referenced in the Technical Implementation phases and diff against the plan to identify which phases are already complete
3. Implement each remaining phase in order using `todo` to track progress
4. After each phase, run `cd app && npm run typecheck && npm run lint`
   - If errors: read the output, fix, re-run until clean
   - Do not move to the next phase until the current phase is error-free
5. After all phases are complete:
   - Start or refresh the Vite dev server at `http://localhost:5173/`
   - Report: "Implementation complete. Local server running at http://localhost:5173/"

**Auto-handoff**: After reporting completion, the orchestrator automatically routes to the Release Agent for non-prod deploy.

**Design flaw handling**: If a technical implementation step is impossible to execute as written (not an implementation error, but a fundamental design problem), the Build Agent:
1. Stops implementation
2. Clearly explains the design flaw
3. Recommends the user involve the Design Agent to revise the technical plan

**Constraints**:
- NEVER run `git commit`, `git push`, `git merge`, or `git checkout`
- NEVER question or modify the plan — execute it as written
- NEVER skip typecheck/lint validation between phases
- NEVER hardcode scoring values — always use `CONFIG.scoring`
- NEVER import the AWS SDK directly in components or hooks
- NEVER use `any` types
- ALWAYS read a file before editing it

**On new session**: Re-read the plan and determine progress by comparing plan steps to actual file contents. Resume from the first incomplete phase.

---

### Release Agent (`release-agent.agent.md`)

**Role**: Manages the full release lifecycle from branch creation through merge to main. Owns the non-prod environment. Triages mid-release feedback. Initiates hotfixes.

**Tools**: `read`, `search`, `execute`, `edit`, `agent`, `todo`

#### Routine A — Start Release

Triggered when the user says "start the release" and `plans/draft.md` exists with a Technical Implementation section.

1. **Determine version**: Run `git tag -l 'v*' --sort=-v:refname | head -1` to find the latest tag. Increment the minor version (e.g. `v1.13` → `v1.14`). Confirm with the user.
2. **Create branch**:
   ```
   git checkout main
   git pull origin main
   git checkout -b release/{version}
   ```
3. **Rename and update plan**: Rename `plans/draft.md` → `plans/release-{version}.md`. Update the Overview table: set Release to `{version}`, Branch to `release/{version}`.
4. **Sync prod data to non-prod**: Run `bash scripts/sync-data-to-nonprod.sh`
5. **Report**: "Release {version} started on branch `release/{version}`. Non-prod environment synced with production data. Say 'implement it' to begin building."

#### Routine B — Active Release Coordination

Available commands while on a `release/vX.Y` branch:

**B1 — Run checks**: `cd app && npm run typecheck && npm run lint`. Report results.

**B2 — Deploy to non-prod**:
1. Run typecheck + lint (abort on failure)
2. Build: `cd app && npx vite build --mode nonprod`
3. Deploy: `bash scripts/deploy.sh nonprod`
4. Verify: `curl -s -o /dev/null -w "%{http_code}" {nonprod-url}` — confirm HTTP 200
5. Auto-commit: `git add -A && git commit -m "wip({version}): {description}"`
6. Report: "Deployed to non-prod at {URL}. Test it now."

**B3 — Commit progress** (without deploy): `git add -A && git commit -m "wip({version}): {description}"`

**B4 — Summarise status**: Read `plans/release-{version}.md`, check which sections exist and which implementation phases map to actual code changes. Report what's done and what remains.

#### Routine C — Mid-Release Feedback Triage

Triggered when the user provides feedback during an active release (e.g. "the button is too small", "I want to change the heading").

1. **Assess size**: Read the current acceptance criteria in the plan. Determine if the feedback is:
   - **Trivial** (cosmetic: colour, size, spacing, typo, copy change) → delegate directly to Build Agent. Build Agent documents the change in the plan's Technical Implementation section.
   - **Significant** (changes user acceptance criteria, adds new behaviour, removes existing behaviour) → route back through Plan Agent (to update AC) → Design Agent (to update technical plan) → Build Agent (to implement)
2. **Communicate**: Tell the user which path was chosen and why. If the user disagrees with the assessment, defer to the user's preference.

#### Routine D — Close Release

1. Run `cd app && npm run typecheck && npm run lint` — abort if errors
2. Read `plans/release-{version}.md` and build the commit message:
   - One-liner: `{version}: {Summary sentence}`
   - Body: bulleted list from "Changes included"
   - Show the commit message to the user and wait for confirmation
3. Commit: `git add -A && git commit -m "{message}"`
4. Push: `git push -u origin release/{version}`
5. Squash-merge:
   ```
   git checkout main
   git pull origin main
   git merge --squash release/{version}
   git commit -m "{message}"
   git push origin main
   ```
6. Delete branches: `git branch -d release/{version}` and `git push origin --delete release/{version}`
7. Report: "Release {version} merged to main. Say 'deploy to production' to tag and deploy."

#### Routine E — Hotfix

Triggered when the user reports a production bug while a release branch is active, or when on main and the user requests a hotfix.

1. **If on a release branch with uncommitted changes**: Commit WIP first:
   ```
   git add -A
   git commit -m "wip({version}): save progress before hotfix"
   ```
2. **Determine hotfix version**: Read latest tag (e.g. `v1.13`), create patch version `v1.13.1` (or increment existing patch).
3. **Create hotfix branch**:
   ```
   git checkout main
   git pull origin main
   git checkout -b hotfix/{hotfix-version}
   ```
4. **Route through standard workflow**: The hotfix goes through Plan → Design → Build (consistent workflow). For very simple fixes, Plan and Design may produce minimal plan content, but the workflow is the same.
5. **Ask user**: "Should this hotfix go through non-prod testing, or deploy directly to prod after checks pass?"
6. **Close hotfix**: Same as Routine D but with the hotfix branch. Squash-merge to main.
7. **Hand off to Production Agent**: For tagging and prod deployment.
8. **Resume original release**: `git checkout release/{original-version}` and report that the release branch is active again.

**Constraints**:
- NEVER deploy to production or create git tags — that is the Production Agent's responsibility
- NEVER use `git push --force` or `git reset --hard`
- ALWAYS confirm commit messages with the user before committing
- ALWAYS sync prod data to non-prod when starting a new release

---

### Production Agent (`production-agent.agent.md`)

**Role**: Gatekeeper for the production environment. Tags releases, deploys to production, manages production data backups. This agent operates — it does not develop or edit files.

**Tools**: `read`, `search`, `execute`

**No file editing.** This agent runs commands and reports results.

#### Routine A — Tag and Deploy to Production

1. **Verify state**: Confirm on `main` branch. Confirm the latest commit is the squash-merge for the intended release.
2. **Create annotated tag**:
   ```
   git tag -a {version} -m "Release {version}"
   git push origin {version}
   ```
3. **Mandatory backup**: Run `bash scripts/backup-data.sh prod`. Commit the backup:
   ```
   git add backups/
   git commit -m "chore: backup game data before {version} deploy"
   git push origin main
   ```
4. **Deploy**: `bash scripts/deploy.sh prod`
5. **Verify**: Confirm exit code 0. Read `cdk-outputs.json` for the production `WebsiteUrl`. Report: "{version} tagged and deployed to production at {URL}."

#### Routine B — Emergency Rollback

Triggered when the user says "rollback production" or reports a critical issue immediately after a prod deploy.

1. **Identify previous tag**: `git tag -l 'v*' --sort=-v:refname` — find the tag before the current one
2. **Checkout and rebuild**: `git checkout {previous-tag}` → `cd app && npx vite build --mode prod`
3. **Deploy**: `bash scripts/deploy.sh prod`
4. **Return to main**: `git checkout main`
5. **Report**: "Production rolled back to {previous-tag} at {URL}. This is a temporary measure — create a hotfix branch to permanently fix the issue."

**No git changes are made during rollback.** The tag and commit history remain unchanged. The rollback is purely a rebuild and redeploy of the previous tag's code.

#### Routine C — Backup Production Data

1. Resolve bucket name from `cdk-outputs.json`
2. Run `bash scripts/backup-data.sh prod`
3. Report the folder created (e.g. `backups/20260412-143000/`)
4. Commit: `git add backups/ && git commit -m "chore: backup game data $(date +%Y%m%d-%H%M%S)"`
5. Push: `git push origin main`

#### Routine D — Restore Production Data

1. List backups: `ls backups/`
2. Ask which backup to restore (default: most recent)
3. Mandatory backup first: run Routine C
4. Run `bash scripts/restore-data.sh backups/{chosen} prod`
5. Verify: `aws s3 ls s3://{prod-bucket}/data/ --recursive`
6. Report success

#### Routine E — Clean Up Old Backups

1. List all backups with dates and sizes: `du -sh backups/*/`
2. Present the list to the user
3. Ask which backups to delete
4. Delete selected: `rm -rf backups/{selected}`
5. Commit: `git add -A && git commit -m "chore: remove old backups"`
6. Push: `git push origin main`

#### Routine F — Production Status

When the user asks about the current production state:
1. Show the latest git tag: `git tag -l 'v*' --sort=-v:refname | head -1`
2. Show when it was created: `git log -1 --format=%ai {tag}`
3. Read `cdk-outputs.json` for the production URL
4. Report: "Production is running {tag}, deployed on {date}, at {URL}."

**Constraints**:
- NEVER edit source files — this agent operates, it doesn't develop
- ALWAYS backup production data before deploying (mandatory, no exceptions)
- ALWAYS require explicit user confirmation before deleting backups or restoring data
- ALWAYS verify the git tag exists before deploying to production (except emergency rollback)

---

## Skill Architecture

Skills define reusable standards and procedures. They are auto-discovered by agents via their `description` field matching the task context. Located at `.github/skills/{name}/SKILL.md`.

### 1. `git-standards`

**Description**: "Use when performing git operations: branching, committing, tagging, merging, or managing release branches and hotfix branches"

**Standards**:
- **Release branch naming**: `release/vX.Y` (major.minor only, no patch)
- **Hotfix branch naming**: `hotfix/vX.Y.Z` (semver patch from latest tag)
- **Release commit format**:
  ```
  vX.Y: One liner summary

  - Change description 1
  - Change description 2
  ```
- **WIP commit format**: `wip(vX.Y): description of progress`
- **Hotfix commit format**: `vX.Y.Z: One liner summary of the fix`
- **Backup commit format**: `chore: backup game data YYYYMMDD-HHMMSS`
- **Tag format**: Annotated tag `vX.Y` (or `vX.Y.Z` for hotfixes) on `main` after squash-merge
- **Merge strategy**: Squash-merge `release/vX.Y` into `main`; delete local and remote branch after merge
- **Branch cleanup**: `git branch -d release/{version}` + `git push origin --delete release/{version}`
- **Version determination**: `git tag -l 'v*' --sort=-v:refname | head -1` to find latest; increment minor for releases, patch for hotfixes
- **Prohibited**: `git push --force`, `git reset --hard`, amending published commits
- **One release at a time**: Finish or close a release before starting the next

### 2. `deployment`

**Description**: "Use when deploying the application, running builds, or preparing for deployment to any environment including production and non-production"

**Standards**:
- **Pre-deploy checklist**:
  1. `cd app && npm run typecheck` — must pass
  2. `cd app && npm run lint` — must pass
  3. Confirm env file exists for the target environment
  4. Confirm bucket name can be resolved from `cdk-outputs.json`
- **Build command**: `cd app && npx vite build --mode {env}` where `{env}` is `prod` or `nonprod`
- **Deploy command**: `bash scripts/deploy.sh {env}`
- **Default environment**: `nonprod` (safety — prod must be explicit)
- **Post-deploy verification**: Confirm script exit code 0; report the environment URL from `cdk-outputs.json`
- **Non-prod deploy**: Build with `--mode nonprod`, deploy to non-prod bucket. Verify HTTP 200 via curl.
- **Prod deploy**: Build with `--mode prod`, deploy to prod bucket. Requires git tag to exist on `main` before deploying (except emergency rollback).
- **Mandatory prod backup**: Always run `bash scripts/backup-data.sh prod` before any production deployment.

### 3. `environments`

**Description**: "Use when working with environment configuration, bucket names, CDK outputs, env files, or switching between production and non-production environments"

**Standards**:
- **Two environments**: `prod` and `nonprod`
- **CDK outputs** in `cdk-outputs.json`:
  | Key | Environment |
  |---|---|
  | `BucketName` | prod |
  | `WebsiteUrl` | prod |
  | `NonProdBucketName` | nonprod |
  | `NonProdWebsiteUrl` | nonprod |
  | `IdentityPoolId` | shared |
- **Env files** (all gitignored):
  | File | Purpose |
  |---|---|
  | `app/.env.prod` | Production VITE_ variables |
  | `app/.env.nonprod` | Non-production VITE_ variables |
  | `app/.env.local` | Local dev (user's choice which env to target) |
- **Vite mode**: `--mode prod` loads `.env.prod`; `--mode nonprod` loads `.env.nonprod`
- **Env generation**: `cd app && npm run env:setup` reads `../cdk-outputs.json` and writes both `.env.prod` and `.env.nonprod`
- **BUCKET_NAME resolution for scripts**: Scripts read `cdk-outputs.json` directly. `BucketName` for prod, `NonProdBucketName` for nonprod.
- **Non-prod data cleanup**: Abandoned at release close — next release start syncs fresh prod data

### 4. `data-management`

**Description**: "Use when backing up, restoring, deleting, or syncing game data between environments or managing backup files"

**Standards**:
- **Backup**: `bash scripts/backup-data.sh {env}` — creates timestamped folder in `backups/`
- **Restore**: `bash scripts/restore-data.sh backups/{timestamp} {env}`
- **Delete**: `bash scripts/delete-data.sh {env}` — requires at least one backup exists; requires explicit user confirmation with exact phrase "yes, delete all data"
- **Sync prod → nonprod**: `bash scripts/sync-data-to-nonprod.sh` — copies prod `data/` prefix to nonprod bucket
- **Backup retention**: Manual cleanup only. Agent lists backups with dates and sizes (`du -sh backups/*/`), user picks which to delete.
- **Commit convention**: `chore: backup game data YYYYMMDD-HHMMSS`
- **Mandatory backup before destructive operations**: Always backup before deploying to prod, restoring data, or deleting data.
- **Backup verification**: After creating a backup, confirm the folder exists and is non-empty.

### 5. `code-standards`

**Description**: "Use when writing, reviewing, or designing code changes for the Lengle application including component patterns, data access, configuration, and TypeScript conventions"

**Standards**:
- **S3 access** (never bypass `app/src/lib/s3.ts`):
  - All reads → `readJson()` (HTTP GET to S3 website URL)
  - All writes → `writeToS3()` (AWS SDK PUT via Cognito credentials)
  - All list operations → `listS3Keys()` (AWS SDK ListObjectsV2 via Cognito credentials)
  - Never use the AWS SDK for reads — use `readJson()` with plain fetch
  - Never import the AWS SDK directly in components or hooks — always go through `s3.ts`
- **Configuration** (never hardcode):
  - All scoring constants from `CONFIG.scoring` in `app/src/lib/config.ts`
  - All date/reset logic through `app/src/lib/date.ts`
  - Player names, IDs, and default emojis defined only in `CONFIG.players` in `app/src/lib/config.ts`
- **React patterns**:
  - Player ID and emoji map shared via `PlayerContext` in `app/src/App.tsx` — never prop-drill
  - Button and component styles follow `specs/spec-ux-design.md`
- **TypeScript**:
  - Strict mode is on — no `any` types
  - All interfaces in `app/src/types/index.ts`
- **Spec update rule**: When designing any change to game behaviour or implementation, update the relevant section of `specs/spec-game-design.md`, `specs/spec-implementation.md`, and/or `specs/spec-ux-design.md`
- **Version bump**: `app/package.json` `version` field must match the release version (e.g. `"1.14.0"` for `v1.14`). This value is injected by Vite as `__APP_VERSION__`.
- **Key files**:
  | File | Purpose |
  |---|---|
  | `specs/spec-game-design.md` | Game rules and acceptance criteria (behaviour source of truth) |
  | `specs/spec-implementation.md` | Technical architecture and conventions |
  | `specs/spec-ux-design.md` | UX patterns and component styles |
  | `app/src/lib/config.ts` | All tuneable config |
  | `app/src/lib/s3.ts` | All S3 operations |
  | `app/src/lib/scoring.ts` | Guess scoring |
  | `app/src/lib/date.ts` | Date and reset logic |
  | `app/src/types/index.ts` | All TypeScript interfaces |

---

## Plan Document Template

This template defines the additive ownership model. Each agent writes only its own sections.

```markdown
# {Title}

## Overview

| Field | Value |
|---|---|
| Release | {version or "TBD" — filled by Release Agent} |
| Branch | {branch or "TBD" — filled by Release Agent} |
| Date | {date — set by Plan Agent} |

### Summary
{2-4 sentences: what this release does and why — written by Plan Agent}

### Changes included
{Bulleted list of high-level change areas — written by Plan Agent}

---

## Acceptance Criteria
{Written by Plan Agent — user-facing acceptance criteria}

| # | Criterion |
|---|---|
| AC-01 | {description} |
| AC-02 | {description} |

---

## Technical Implementation
{Written by Design Agent — phased implementation steps}

### Phase 1 — {Name}
**Files:** {list of files created or modified}

{Numbered steps with explicit file paths and specific code changes}

### Phase 2 — {Name}
{Steps}

---

## Verification

### User Testing
{Written by Plan Agent — manual verification steps mapped to acceptance criteria}

1. AC-01: {how to verify}
2. AC-02: {how to verify}

### Technical Verification
{Written by Design Agent}

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
{Plus specific technical checks}

---

## Decisions & Scope
{Written by Design Agent — key assumptions, trade-offs, what is in and out of scope}
```

**State inference from plan structure**:
| Condition | Inferred State |
|---|---|
| `plans/draft.md` exists, no Technical Implementation section | Planned (awaiting design) |
| `plans/draft.md` exists, has Technical Implementation section | Designed (ready to start release) |
| `plans/release-vX.Y.md` exists, on matching branch | Active release |
| No `plans/draft.md`, on `main`, latest tag matches latest merge | Idle (ready for next release) |

---

## SDLC Flow

### Standard Release Flow

```
User: "I want to add dark mode"
  → Orchestrator (on main, no draft.md) → Plan Agent
    → Interviews user, researches codebase via Explore subagent
    → Writes plans/draft.md (Overview + Acceptance Criteria + User Testing)
    → Iterates with user until confirmed

User: "design it"
  → Orchestrator (draft.md exists, no Technical Implementation) → Design Agent
    → Reads draft.md + all relevant source files + specs
    → Surfaces any spec conflicts with recommendations; user decides
    → Updates specs with user decisions
    → Appends Technical Implementation + Technical Verification + Decisions & Scope
    → Presents for user review

User: "start the release"
  → Orchestrator (draft.md has Technical Implementation, on main) → Release Agent
    → Determines next version from git tags (e.g. v1.14)
    → Creates release/v1.14 branch
    → Renames plans/draft.md → plans/release-v1.14.md
    → Syncs prod data to non-prod bucket
    → Reports: "Release v1.14 started. Say 'implement it' to begin."

User: "implement it"
  → Orchestrator (on release/v1.14) → Build Agent
    → Reads plans/release-v1.14.md
    → Implements all phases, validates typecheck+lint after each phase
    → Starts localhost at http://localhost:5173/
    → Reports: "Implementation complete"
  → Orchestrator auto-routes → Release Agent
    → Builds with --mode nonprod, deploys to non-prod bucket
    → Verifies HTTP 200
    → Auto-commits: "wip(v1.14): implement dark mode"
    → Reports: "Deployed to non-prod at {URL}. Test it now."

User: "the toggle button is too small" (trivial feedback)
  → Orchestrator → Release Agent (triages: trivial cosmetic) → Build Agent
    → Implements fix, validates typecheck+lint
  → Orchestrator auto-routes → Release Agent
    → Deploys to non-prod, auto-commits WIP
    → Reports: "Updated non-prod at {URL}"

User: "actually I want a theme selector, not just a toggle" (significant feedback)
  → Orchestrator → Release Agent (triages: significant AC change)
    → Routes to Plan Agent (updates AC in release-v1.14.md)
    → Routes to Design Agent (updates Technical Implementation)
    → Routes to Build Agent (implements revised plan)
  → Orchestrator auto-routes → Release Agent
    → Deploys to non-prod, auto-commits WIP

User: "close the release"
  → Orchestrator → Release Agent
    → Runs typecheck+lint, builds commit message from plan
    → Shows commit message for user confirmation
    → Commits, pushes, squash-merges to main, deletes branch
    → Reports: "Release v1.14 merged to main"

User: "deploy to production"
  → Orchestrator → Production Agent
    → Creates annotated tag v1.14 on main
    → Mandatory backup of prod data
    → Builds with --mode prod, deploys to prod bucket
    → Reports: "v1.14 tagged and deployed to production at {URL}"
```

### Hotfix Flow

```
User: "there's a scoring bug in production" (while on release/v1.15)
  → Orchestrator → Release Agent
    → Commits WIP on release/v1.15: "wip(v1.15): save progress before hotfix"
    → Determines hotfix version: v1.14.1
    → Creates hotfix/v1.14.1 branch from main

User: (describes the bug)
  → Plan Agent → writes plans/draft.md with minimal AC
  → Design Agent → appends minimal technical implementation
  → Build Agent → implements fix, validates

User: "deploy directly to prod" (or "test on nonprod first")
  → Release Agent → closes hotfix (merge to main, delete branch)
  → Production Agent → tags v1.14.1, deploys to prod
  → Release Agent → resumes release/v1.15

```

### Emergency Rollback Flow

```
User: "rollback production" (critical issue after v1.14 deploy)
  → Orchestrator → Production Agent
    → Identifies previous tag (v1.13)
    → Rebuilds v1.13 code, deploys to prod (no git changes)
    → Reports: "Rolled back to v1.13. Create a hotfix to permanently fix the issue."
```

### Session Resumption Flow

```
User: "where were we?" (new session, on release/v1.14)
  → Orchestrator (detects release/v1.14 branch) → Release Agent
    → Reads plans/release-v1.14.md
    → Checks which plan sections exist
    → Diffs technical implementation against actual code to gauge Build progress
    → Reports: "Active release v1.14. Phase 1-3 implemented, Phase 4-5 remaining.
       Last WIP commit: 2 hours ago. Non-prod last deployed at {URL}.
       Say 'implement it' to continue building, or 'deploy for testing' to redeploy."
```

---

## Infrastructure Changes

### CDK Stack Update (`infra/lib/lengle-stack.ts`)

**Non-prod S3 bucket** (`LengleBucketNonProd`):
- Same configuration as the production bucket:
  - `websiteIndexDocument: 'index.html'`
  - `websiteErrorDocument: 'index.html'`
  - `blockPublicAccess: BlockPublicAccess.BLOCK_ACLS`
  - `versioned: true`
  - CORS: `AllowedOrigins: ['*']`, `AllowedMethods: [GET, PUT]`, `AllowedHeaders: ['*']`, `ExposeHeaders: ['ETag']`
- Separate bucket policy for public `s3:GetObject`
- Independent from the production bucket

**Update Cognito IAM role** (`LengleUnauthRole`):
- Add non-prod bucket to the existing unauthenticated role's policy
- `s3:GetObject` + `s3:PutObject` on `arn:aws:s3:::{nonprod-bucket}/data/*`
- `s3:ListBucket` on `arn:aws:s3:::{nonprod-bucket}` with condition `s3:prefix` starts with `data/`

**New CDK outputs**:
- `NonProdBucketName` — non-prod S3 bucket name
- `NonProdWebsiteUrl` — non-prod S3 website endpoint

---

## Script Changes

### `scripts/deploy.sh` — Parameterised

Takes environment as first argument. Defaults to `nonprod` for safety. Reads the correct bucket name from `cdk-outputs.json` based on environment. Builds with `npx vite build --mode {env}`.

### `scripts/sync-data-to-nonprod.sh` — New

Reads both bucket names from `cdk-outputs.json`. Runs `aws s3 sync s3://{prod-bucket}/data/ s3://{nonprod-bucket}/data/`.

### `scripts/backup-data.sh` — Parameterised

Takes optional environment argument (defaults to `prod`). Reads the correct bucket name from `cdk-outputs.json`.

### `scripts/restore-data.sh` — Parameterised

Takes backup directory + optional environment argument.

### `scripts/delete-data.sh` — Parameterised

Takes environment argument. Reads the correct bucket name from `cdk-outputs.json`.

### `scripts/generate-env.mjs` — New

Node.js script that reads `cdk-outputs.json` and writes `app/.env.prod` and `app/.env.nonprod`. Invoked via `npm run env:setup` in `app/package.json`.

---

## Workspace Structure After v1.13

```
.github/
├── copilot-instructions.md              ← Project overview + orchestrator routing rules
├── agents/
│   ├── orchestrator.agent.md            ← State-aware thin router
│   ├── plan-agent.agent.md              ← Requirements & acceptance criteria
│   ├── design-agent.agent.md            ← Technical architecture & implementation design
│   ├── build-agent.agent.md             ← Code implementation (pure executor)
│   ├── release-agent.agent.md           ← Release lifecycle & non-prod environment
│   └── production-agent.agent.md        ← Production operations (tag, deploy, backups)
└── skills/
    ├── git-standards/
    │   └── SKILL.md                     ← Branch, commit, tag, merge standards
    ├── deployment/
    │   └── SKILL.md                     ← Build, deploy, pre/post checks
    ├── environments/
    │   └── SKILL.md                     ← Prod/nonprod config, env files, CDK outputs
    ├── data-management/
    │   └── SKILL.md                     ← Backup, restore, delete, sync procedures
    └── code-standards/
        └── SKILL.md                     ← S3 access patterns, TypeScript, React patterns
scripts/
├── deploy.sh                            ← Parameterised: deploy.sh {env}
├── backup-data.sh                       ← Parameterised: backup-data.sh {env}
├── restore-data.sh                      ← Parameterised: restore-data.sh {backup} {env}
├── delete-data.sh                       ← Parameterised: delete-data.sh {env}
├── sync-data-to-nonprod.sh             ← New: sync prod data to nonprod
└── generate-env.mjs                     ← New: generate .env files from CDK outputs
```

**Removed**:
- `.github/prompts/backup-game-data.prompt.md`
- `.github/prompts/delete-game-data.prompt.md`
- `.github/prompts/deploy.prompt.md`
- `.github/prompts/restore-game-data.prompt.md`
- `.github/prompts/update-game.prompt.md`

---

## Implementation Plan

### Phase 1 — Infrastructure
*No dependencies on other phases*

| Step | File | Action |
|---|---|---|
| 1.1 | `infra/lib/lengle-stack.ts` | Add non-prod bucket, update IAM role, add CDK outputs |
| 1.2 | `scripts/deploy.sh` | Parameterise with environment argument |
| 1.3 | `scripts/backup-data.sh` | Add optional environment argument |
| 1.4 | `scripts/restore-data.sh` | Add optional environment argument |
| 1.5 | `scripts/delete-data.sh` | Add environment argument |
| 1.6 | `scripts/sync-data-to-nonprod.sh` | Create new script |
| 1.7 | `scripts/generate-env.mjs` | Create new script |
| 1.8 | `app/package.json` | Add `env:setup` npm script |
| 1.9 | `.gitignore` | Add `app/.env.prod`, `app/.env.nonprod` |
| 1.10 | `app/.env.local.example` | Update with environment notes |

  > **Resolved (Build Agent):** Keep `app/.env.local.example` focused on local development guidance only, and add a separate `app/.env.nonprod.example` template for the non-prod Vite mode example. This preserves the local-dev onboarding file while still documenting the non-prod build target explicitly.

### Phase 2 — Skills
*No dependencies; parallel with Phase 1*

| Step | File | Action |
|---|---|---|
| 2.1 | `.github/skills/git-standards/SKILL.md` | Create |
| 2.2 | `.github/skills/deployment/SKILL.md` | Create |
| 2.3 | `.github/skills/environments/SKILL.md` | Create |
| 2.4 | `.github/skills/data-management/SKILL.md` | Create |
| 2.5 | `.github/skills/code-standards/SKILL.md` | Create |

### Phase 3 — Agents
*Depends on Phase 2*

| Step | File | Action |
|---|---|---|
| 3.1 | `.github/agents/orchestrator.agent.md` | Create |
| 3.2 | `.github/agents/plan-agent.agent.md` | Create |
| 3.3 | `.github/agents/design-agent.agent.md` | Create |
| 3.4 | `.github/agents/build-agent.agent.md` | Rewrite (pure executor) |
| 3.5 | `.github/agents/release-agent.agent.md` | Rewrite (non-prod scope, version from tags) |
| 3.6 | `.github/agents/production-agent.agent.md` | Create |

### Phase 4 — Documentation
*Depends on Phase 3*

| Step | File | Action |
|---|---|---|
| 4.1 | `.github/copilot-instructions.md` | Rewrite (routing + project overview) |
| 4.2 | `README.md` | Rewrite (new architecture, environments, SDLC) |
| 4.3 | `specs/spec-implementation.md` | Update (environments, agents, skills, SDLC sections) |
| 4.4 | `paseo-copilot-cli-setup.md` | Update (new agent structure) |
| 4.5 | `.github/prompts/` | Delete all 5 prompt files |

  > **Resolved (Build Agent):** The repo does not currently contain `paseo-copilot-cli-setup.md`, so create a new root-level file with that name and document the new single-chat orchestrator routing model there rather than updating a missing file.

### Phase 5 — Version bump

| Step | File | Action |
|---|---|---|
| 5.1 | `app/package.json` | Bump version to `1.13.0` |

### Phase 6 — CDK Deploy (manual, post-implementation)

| Step | Command | Action |
|---|---|---|
| 6.1 | `cd infra && npx cdk deploy --outputs-file ../cdk-outputs.json` | Deploy updated stack |
| 6.2 | `cd app && npm run env:setup` | Generate .env.prod and .env.nonprod |
| 6.3 | `bash scripts/sync-data-to-nonprod.sh` | Populate non-prod with prod data |
| 6.4 | `bash scripts/deploy.sh nonprod` | Deploy app to non-prod and verify |
| 6.5 | `bash scripts/deploy.sh prod` | Deploy app to prod and verify no changes |

---

## Acceptance Criteria

| # | Criterion |
|---|---|
| AC-01 | A non-prod S3 bucket exists alongside the prod bucket, provisioned by the same CDK stack |
| AC-02 | The Cognito identity pool grants read/write/list access to both buckets |
| AC-03 | `bash scripts/deploy.sh nonprod` builds with non-prod env vars and deploys to the non-prod bucket |
| AC-04 | `bash scripts/deploy.sh prod` builds with prod env vars and deploys to the prod bucket |
| AC-05 | `bash scripts/deploy.sh` with no argument defaults to `nonprod` |
| AC-06 | `npm run env:setup` reads `cdk-outputs.json` and generates both `.env.prod` and `.env.nonprod` |
| AC-07 | `bash scripts/sync-data-to-nonprod.sh` copies all `data/` objects from the prod bucket to the non-prod bucket |
| AC-08 | All 6 agent files exist and are discoverable in the VS Code Copilot Chat agent picker |
| AC-09 | All 5 skill files exist and auto-load when agents perform relevant operations |
| AC-10 | The orchestrator correctly routes "plan a new feature" to the Plan Agent |
| AC-11 | The orchestrator correctly routes "design it" to the Design Agent |
| AC-12 | The orchestrator correctly routes "implement it" to the Build Agent |
| AC-13 | The orchestrator correctly routes "deploy for testing" to the Release Agent |
| AC-14 | The orchestrator correctly routes "deploy to production" to the Production Agent |
| AC-15 | The orchestrator auto-routes to the Release Agent after the Build Agent reports completion |
| AC-16 | The Release Agent auto-commits WIP after each non-prod deploy |
| AC-17 | The Production Agent requires a git tag on main before deploying to production |
| AC-18 | The Production Agent mandatorily backs up prod data before every prod deploy |
| AC-19 | All 5 prompt files in `.github/prompts/` are deleted |
| AC-20 | `README.md` documents the new 6-agent architecture, environments, and SDLC workflow |
| AC-21 | `specs/spec-implementation.md` documents the new environment architecture and agent/skill structure |
| AC-22 | `.github/copilot-instructions.md` contains orchestrator routing rules and a lightweight project overview |
| AC-23 | The app version in `app/package.json` is `1.13.0` |

---

## Verification

### User Testing

1. AC-01/AC-02: After CDK deploy, confirm `cdk-outputs.json` has `NonProdBucketName` and `NonProdWebsiteUrl`
2. AC-03/AC-04/AC-05: Run `deploy.sh nonprod` and `deploy.sh prod` — app loads at both URLs; no-arg defaults to nonprod
3. AC-06: Run `npm run env:setup` — both env files created with correct values
4. AC-07: Run sync script — nonprod bucket has same data objects as prod
5. AC-08: Open VS Code Copilot Chat agent picker — all 6 agents visible
6. AC-10–AC-15: Start a Copilot CLI session and test natural language routing for each agent
7. AC-16: Deploy to non-prod and verify a WIP commit was created automatically
8. AC-17: Attempt prod deploy without a tag — verify it is refused
9. AC-18: Deploy to prod — verify a backup was created in `backups/`
10. AC-20: Read `README.md` — confirms it documents the new architecture

### Technical Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. `cd infra && npx cdk synth` — valid CloudFormation template with both buckets
4. `cd infra && npx cdk deploy --outputs-file ../cdk-outputs.json` — succeeds with new outputs
5. Verify `.env.prod` and `.env.nonprod` point to different bucket names
6. Verify non-prod app at non-prod URL loads correctly and reads/writes to non-prod bucket
7. Verify prod app at prod URL is unchanged

---

## Files Summary

**New files (12)**:
| File | Purpose |
|---|---|
| `.github/agents/orchestrator.agent.md` | State-aware thin router |
| `.github/agents/plan-agent.agent.md` | Requirements & acceptance criteria |
| `.github/agents/design-agent.agent.md` | Technical architecture & design |
| `.github/agents/production-agent.agent.md` | Production operations |
| `.github/skills/git-standards/SKILL.md` | Git branch, commit, tag, merge standards |
| `.github/skills/deployment/SKILL.md` | Build and deploy procedures |
| `.github/skills/environments/SKILL.md` | Prod/nonprod config and env files |
| `.github/skills/data-management/SKILL.md` | Backup, restore, delete, sync procedures |
| `.github/skills/code-standards/SKILL.md` | S3 access, TypeScript, React patterns |
| `scripts/sync-data-to-nonprod.sh` | Sync prod data to nonprod bucket |
| `scripts/generate-env.mjs` | Generate .env files from CDK outputs |
| `app/.env.nonprod.example` | Template for non-prod env file |

**Modified files (14)**:
| File | Change |
|---|---|
| `.github/agents/build-agent.agent.md` | Rewritten as pure executor |
| `.github/agents/release-agent.agent.md` | Rewritten with non-prod scope, hotfix support |
| `.github/copilot-instructions.md` | Rewritten: routing rules + lightweight project overview |
| `infra/lib/lengle-stack.ts` | Add non-prod bucket + IAM + outputs |
| `scripts/deploy.sh` | Parameterised with environment |
| `scripts/backup-data.sh` | Parameterised with environment |
| `scripts/restore-data.sh` | Parameterised with environment |
| `scripts/delete-data.sh` | Parameterised with environment |
| `.gitignore` | Add `app/.env.prod`, `app/.env.nonprod` |
| `app/.env.local.example` | Updated with environment notes |
| `app/package.json` | Version bump + `env:setup` script |
| `README.md` | Fully rewritten |
| `specs/spec-implementation.md` | Updated architecture sections |
| `paseo-copilot-cli-setup.md` | Updated agent invocation docs |

**Deleted files (5)**:
| File | Reason |
|---|---|
| `.github/prompts/backup-game-data.prompt.md` | Absorbed into Production Agent |
| `.github/prompts/delete-game-data.prompt.md` | Absorbed into Production Agent |
| `.github/prompts/deploy.prompt.md` | Absorbed into Release + Production Agents |
| `.github/prompts/restore-game-data.prompt.md` | Absorbed into Production Agent |
| `.github/prompts/update-game.prompt.md` | Absorbed into Plan + Design + Build Agents |

---

## Scope Boundaries

**In scope**:
- Non-prod S3 bucket (CDK, same stack)
- 6 agent files (orchestrator + 5 domain agents)
- 5 skill files
- Script parameterisation for multi-environment
- Env file auto-generation
- Hotfix workflow and emergency rollback capability
- All workspace documentation updates (README, specs, copilot-instructions, Paseo docs)
- Prompt file cleanup

**Out of scope (deferred)**:
- CloudFront / custom domain for either environment
- CI/CD automation (GitHub Actions)
- Automated testing framework
- Environment promotion pipelines beyond manual tag + deploy
- Changes to game application logic (React components, game rules, UI)
