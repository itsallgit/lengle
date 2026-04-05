# Release v1.8 — Release Agent improvements: post-close branching, data management, and local testing

## Overview

| Field | Value |
|---|---|
| Release | v1.8 |
| Branch | release/v1.8 |
| Date | 2026-04-06 |
| Status | Done |

### Summary
This release improves the Release Agent's workflow in three ways: it fixes the post-close branch handling so the workspace correctly stays on `main` after a release is closed; it adds a new Routine D that lets the release agent manage data saves directly (backup, restore, and clear live S3 data with git commits); and it adds a local-run step before production deploy so the user can test changes at localhost before pushing to S3.

### Changes included
- Fix: workspace stays on `main` after closing a release (remove erroneous C8 step)
- New Routine D: data management (backup, restore, clear) with git commits to `backups/`
- New B2: run app locally at http://localhost:5173 before deploying
- Renumber B2→B3, B3→B4, B4→B5 in Routine B
- Update session-start and A7 handoff text to suggest local testing
- Update `copilot-instructions.md` to document `backups/` folder

---

## Implementation Plan

All changes are in two files only. No app code changes. No TypeScript / lint concerns.

> **Resolved (Build Agent):** Plan was unambiguous. All assumptions matched the real code exactly. C8/C9 text, Routine B structure (B1–B4), and absence of Routine D all confirmed. Implemented as written with no deviations.

### Phase 1 — Fix post-close branch handling in `release-agent.agent.md`

File: `.github/agents/release-agent.agent.md`

1. **Remove step C8** entirely. C8 currently reads:
   ```
   git checkout release/{version}
   ```
   After C7 squash-merges into main, the workspace is already on `main`. Returning to the release branch is wrong and confuses future `git checkout main` in A3.

2. **Update C9 report text** to confirm the workspace is on `main`:
   - Old: "The release branch `release/{version}` is preserved for reference" + ask about next release
   - New: "Your workspace is now on `main`. The release branch `release/{version}` is preserved for reference. Ready to start the next release?"

### Phase 2 — Add Routine D (data management) in `release-agent.agent.md`

File: `.github/agents/release-agent.agent.md`

Add a new **Routine D — Data Management** section after Routine C. It has three sub-routines triggered by user phrases such as "backup data", "restore data", "clear data", "data reset", "wipe data", "data save".

**D1 — Backup live data**
1. Confirm `BUCKET_NAME` is set: `echo $BUCKET_NAME`. If empty, tell user to set it and stop.
2. Run `bash scripts/backup-data.sh` — this syncs `s3://${BUCKET_NAME}/data/` to a new timestamped folder under `backups/`.
3. Report the folder created (e.g. `backups/20260406-143000/`).
4. Commit the backup to git:
   ```
   git add backups/
   git commit -m "chore: backup game data <TIMESTAMP>"
   ```
5. Confirm the commit hash and report success.

**D2 — Restore from backup**
1. Confirm `BUCKET_NAME` is set: `echo $BUCKET_NAME`. If empty, stop.
2. List available backups: `ls backups/` — if the directory is empty or missing, stop and tell user to run a backup first.
3. Ask which backup to restore; default to the most recent one.
4. Run `bash scripts/restore-data.sh backups/<chosen>`.
5. Verify the restore: `aws s3 ls s3://${BUCKET_NAME}/data/ --recursive` — confirm files are present.
6. Report success.

**D3 — Clear live data**
1. Check `backups/` for at least one backup directory. If none exists, **stop** — require the user to run D1 first before any destructive action.
2. Check the timestamp of the most recent backup. If it is not from today, strongly recommend running a fresh backup and offer to do it now (run D1 inline) before proceeding.
3. Ask for explicit reconfirmation: *"You are about to permanently delete all live game data from S3. Type **yes, delete all data** to confirm."* — a plain "yes" is not sufficient. Abort if anything other than that exact phrase is given.
4. Run `bash scripts/delete-data.sh`.
5. Verify deletion: `aws s3 ls s3://${BUCKET_NAME}/data/` — confirm no objects are returned.
6. Report: all live data cleared. Remind user that data can be restored at any time using D2 from `backups/<backup>`.

Also update the frontmatter `description` field to add data management trigger phrases: "backup data", "restore data", "clear data", "data save", "data reset", "wipe data".

### Phase 3 — Add local-run step and renumber Routine B in `release-agent.agent.md`

File: `.github/agents/release-agent.agent.md`

1. **Insert new B2 — Run locally** between existing B1 (run checks) and existing B2 (deploy):

   ```
   ### B2 — Run locally
   Run the Vite dev server so the user can test changes before deploying to production:
   ```
   cd app && npm run dev
   ```
   The app will be available at **http://localhost:5173**.
   Note: this is a long-running process. The user should test the app, then stop the server with Ctrl+C before deploying to production.
   There is NO separate test or staging environment — localhost is the only pre-production testing option.
   ```

2. **Renumber** the existing steps: old B2 (Deploy) → B3, old B3 (Spec questions) → B4, old B4 (Summarise open work) → B5.

3. **Update "On Every Session Start"** — in the Active Release mode bullet, add:
   > "Back from the build agent? Run `run locally` to test at http://localhost:5173 before deploying."

4. **Update A7 — Handoff** — add a step 5:
   > "When the build agent is done, come back here and say **`run locally`** to test at http://localhost:5173 before deploying to production."

### Phase 4 — Update `copilot-instructions.md`

File: `.github/copilot-instructions.md`

In the **Key files** section, add a new entry after the existing `app/src/words/wordlist.ts` line (or at the end of the list):
```
- `backups/` — timestamped game data saves committed to git, managed by the release agent (Routine D)
```

---

## Verification

1. `cd app && npm run typecheck` — zero errors (no app code changed)
2. `cd app && npm run lint` — zero errors (no app code changed)
3. Read through updated `release-agent.agent.md` and verify:
   - C7 is followed directly by C9 (no C8)
   - C9 confirms workspace is on `main`
   - Routine D is present with all three sub-routines (D1, D2, D3)
   - D3 requires exact phrase "yes, delete all data"
   - B1 through B5 are present and correctly numbered
   - Session start and A7 mention "run locally"
4. Read through updated `copilot-instructions.md` and confirm `backups/` is listed

---

## Decisions & Scope

- **`backups/` kept as-is** — the existing scripts and three `.github/prompts/` data files already use `backups/` and are correct; no changes needed to those files.
- **`npm run dev` for local testing** — faster than `npm run preview` and requires no prior build step.
- **Exact phrase for D3** — "yes, delete all data" rather than a plain yes, given the destructive and irreversible nature of clearing live S3 data.
- **Standalone data prompt files not changed** — `backup-game-data.prompt.md`, `restore-game-data.prompt.md`, and `delete-game-data.prompt.md` remain as slash-command alternatives; they already use `backups/` correctly.
- **Out of scope:** build agent, CI/CD, app rollback for bad deploys, any TypeScript/component changes.
