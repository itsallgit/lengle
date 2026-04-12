---
description: Use when performing git operations including branch creation, WIP commits, release merges, tags, or hotfix branch management.
---

# Git Standards

## Branch naming

- Release branches use `release/vX.Y`
- Hotfix branches use `hotfix/vX.Y.Z`
- Only one release branch should be active at a time

## Commit and tag formats

- Release commit: `vX.Y: One line summary`
- WIP commit: `wip(vX.Y): description`
- Hotfix commit: `vX.Y.Z: One line summary`
- Backup commit: `chore: backup game data YYYYMMDD-HHMMSS`
- Tags are annotated and created on `main` after the squash merge

## Merge rules

- Release and hotfix branches squash-merge into `main`
- Delete the local and remote release branch after a successful merge
- Never use `git push --force`, `git reset --hard`, or amend published history

## Versioning

- Release versions are major + minor only
- Hotfix versions increment the patch number from the latest tag
- Determine the latest version with `git tag -l 'v*' --sort=-v:refname | head -1`