---
description: Use when performing git operations including branch creation, commits, release merges, tags, or hotfix branch management.
---

# Git Standards

## Branch naming

- Release branches use `release/vX.Y`
- Hotfix branches use `hotfix/vX.Y.Z`
- Only one release branch should be active at a time

## Commit and tag formats

- Release commit (squash-merge on `main`): `vX.Y: One line summary`
- Hotfix commit (squash-merge on `main`): `vX.Y.Z: One line summary`
- Plan Agent: `plan(vX.Y): description`
- Design Agent: `design(vX.Y): description`
- Build Agent: `build(vX.Y): description`
- Release Agent: `release(vX.Y): description`
- Production backup: `backup: game data YYYYMMDD-HHMMSS`
- Tags are annotated and created on `main` after the squash merge

## Plan file naming

- Release plans: `plans/vX.Y.0-release.md`
- Hotfix plans: `plans/vX.Y.Z-hotfix.md`
- Plans are created on their release/hotfix branch, never on `main`

## Merge rules

- Release and hotfix branches squash-merge into `main`
- Push the release branch to origin before squash-merging (preserves agent commit history)
- Delete only the local release branch after a successful merge (remote branch remains as archive)
- Never use `git push --force`, `git reset --hard`, or amend published history

## Versioning

- Release versions are major + minor only (e.g. v1.16)
- Hotfix versions increment the patch number from the latest tag (e.g. v1.16.1)
- Plan files always include the patch version: `.0` for releases, `.N` for hotfixes
- Determine the latest version with `git tag -l 'v*' --sort=-v:refname | head -1`