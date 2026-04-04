# Release v1.0 — Process Infrastructure + UX Improvements

## Overview

| Field | Value |
|---|---|
| Release | v1.0 |
| Branch | release/v1.0 |
| Date | 2026-04-04 |
| Status | In Progress |

### Summary
This is an "inception" release: it simultaneously establishes the formal Lengle release workflow (the process all future releases follow) and delivers the first significant batch of UX improvements. The app was bootstrapped without a formal release process; this release formalises that retroactively. App changes include renaming a player, hiding per-letter scores to increase challenge, a full UI redesign with letter tile animations, and per-player emoji customisation throughout the app.

### Changes included
- **Release workflow infrastructure** — Release Agent, plan document template, CI/CD backup/delete/restore scripts, updated prompts, `copilot-instructions.md` update, README documentation
- **Player rename** — Alex → Troy across all config, specs, and data files
- **Hide per-letter scores** — Show total word score only; remove the per-letter `[0, 1, 3, ...]` display
- **UI revamp** — Letter tile design, tile-pop animations, indigo/violet color palette, full mobile width
- **Player emoji** — Per-player customisable emoji stored in S3, displayed in all player-name locations

---

## Implementation Plan

### Phase 0 — Release Workflow Infrastructure *(no dependencies)*

1. **Create** `.github/agents/release-agent.agent.md` — custom Release Agent that creates git branches, interviews user, researches codebase, and writes plan documents
2. **Create** `plans/release-v1.0.md` — this document (written manually for the inception release)
3. **Update** `.github/copilot-instructions.md` — add `## Release workflow` section: 5-step process, how to invoke the Release Agent, location of plan files
4. **Update** `README.md` — add "Release Workflow" section near the top explaining the 5-step process, Release Agent invocation, and CI/CD prompt usage
5. **Rewrite** `.github/agents/release-agent.agent.md` — expand from planning-only to full lifecycle coordinator: Start Release (branch + interview + plan), Active Release (checks + deploy + spec Q&A), Close Release (typecheck + lint gate, squash merge to `main` with standard commit format); update `description` and `argument-hint` frontmatter
6. **Update** `.github/copilot-instructions.md` — replace 5-step handoff with lifecycle model, document standard commit message format (`vX.Y: summary\n\n- bullet list`)
7. **Update** `specs/spec-implementation.md` §8 — add §8.1 Release Workflow table and §8.2 Release Agent summary; renumber §8.1–8.3 to §8.3–8.5
8. **Replace** `README.md` — new project overview README covering structure, architecture, how to work, key files, dev setup, deploy, and game data recovery; move old MVP build guide to `plans/plan-MVP.md`

### Phase 1 — CI/CD Scripts & Prompts *(parallel with Phase 0)*

5. **Create** `scripts/backup-data.sh` — syncs `s3://${BUCKET_NAME}/data/` to `backups/$(date +%Y%m%d-%H%M%S)/`; requires `BUCKET_NAME` env var; prints git commit instruction on completion
6. **Create** `scripts/delete-data.sh` — `aws s3 rm s3://${BUCKET_NAME}/data/ --recursive`; requires `BUCKET_NAME`
7. **Create** `scripts/restore-data.sh` — takes `$1` as backup dir arg; `aws s3 sync "$1" s3://${BUCKET_NAME}/data/`; requires `BUCKET_NAME`
8. **Create** `.github/prompts/backup-game-data.prompt.md` — checks `BUCKET_NAME` is set, runs backup script, stages and commits the resulting `backups/` folder to git
9. **Create** `.github/prompts/delete-game-data.prompt.md` — confirms a recent backup exists in `backups/` before running delete; then runs delete script and verifies S3 is empty
10. **Create** `.github/prompts/restore-game-data.prompt.md` — lists available `backups/` directories, runs restore script for the chosen backup, verifies files appear in S3
11. **Update** `.github/prompts/deploy.prompt.md` — add typecheck and lint steps before deploy; keep existing pre-deploy env var checks
12. Verify `backups/` is **not** in `.gitignore` — it must be committed to source control

### Phase 2 — Player Rename *(depends on Phase 1 for data operations)*

13. **Update** `app/src/lib/config.ts` — `name: 'Alex'` → `name: 'Troy'`
14. **Update** `players.json` — same rename
15. **Update** `specs/spec-game-design.md`:
    - §2 Players: no text change needed
    - §5.4 Per-Letter Score Display: replace section with new rule — total word score only
    - §6.3 Example: Alex → Troy in table
    - §7.3 Display: remove "per-letter scores" from the social feed visibility description
    - Add §12 Player Emoji: document emoji customisation feature
16. **Update** `specs/spec-implementation.md`:
    - §3 Repository structure: add `plans/`, `.github/agents/`, new scripts, new prompts
    - §5.8 JSON schemas: Alex → Troy; add `data/players/profiles.json` schema
    - §6.2 Configuration code snippet: Alex → Troy; add `defaultEmoji` fields
    - Add PlayerContext emoji extension documentation
17. **Operations** (run after code is deployed — use the new prompts):
    - Run `backup-game-data` prompt → archives existing S3 data into `backups/` and commits
    - Run `delete-game-data` prompt → wipes all `data/` objects from S3
    - Run `deploy.prompt.md` → deploys renamed app

### Phase 3 + 4 — Score Display Redesign + UI Revamp *(implement together — both modify GuessRow)*

18. **Update** `app/tailwind.config.js` — add `tile-pop` keyframe and `animate-tile-pop` animation class
19. **Rewrite** `app/src/components/Puzzles/GuessRow.tsx`:
    - Props: `word: string`, `total: number` only (remove `perLetterScores`)
    - Render 5 letter tiles (indigo bg `bg-indigo-600`, white bold text) in a flex row
    - Stagger animation: `className="animate-tile-pop"` + `style={{ animationDelay: '${i * 100}ms' }}`
    - Correct guess (`total === 0`): tiles use `bg-emerald-500`
    - Score chip: yellow-orange pill (`bg-amber-400`) after the tiles, showing total
20. **Update** `app/src/components/Puzzles/GuessList.tsx` — remove `perLetterScores` from `GuessRow` props call; update spacing to `space-y-2`
21. **Rewrite** `app/src/components/Puzzles/GuessInput.tsx` — full-width `w-full` input with larger text, `flex-col` layout, bold indigo submit button full-width on mobile
22. **Update** `app/src/components/Puzzles/PuzzlePanel.tsx` — `rounded-2xl` card, colored setter heading (`text-indigo-700`), remove inner `px` constraints
23. **Update** `app/src/components/Puzzles/PuzzleView.tsx` — remove `max-w-lg` constraint, use `w-full px-4`
24. **Update** `app/src/components/PlayerSelect/PlayerSelect.tsx` — indigo→violet gradient background (`from-indigo-600 to-violet-600`), large game title, `rounded-2xl` card with shadow
25. **Update** `app/src/components/Lobby/PlayerStatusList.tsx` — green row when submitted (`border-emerald-200 bg-emerald-50 text-emerald-800`), amber row when pending (`border-amber-200 bg-amber-50 text-amber-800`)
26. **Update** `app/src/components/Lobby/Lobby.tsx` — section headers styled; State B waiting message in amber card; State C ready card with indigo button (already exists, minor polish)
27. **Update** `app/src/components/shared/Header.tsx` — `bg-indigo-600` bar, white text for date and links
28. **Update** `app/src/components/shared/Nav.tsx` — white link text on dark background, active state uses `font-bold underline` in white
29. **Update** `app/src/components/Leaderboard/Leaderboard.tsx` — active tab style: `border-b-2 border-white text-white`, inactive: `text-indigo-200`; move tab bar into a sub-header style
30. **Update** `app/src/components/Leaderboard/TodayTab.tsx` — winner banner: `bg-amber-50 border-amber-200 text-amber-900`; winner cells: trophy emoji `🏆`
31. **Update** `app/src/components/Leaderboard/AllTimeTab.tsx` — stat values: `text-2xl font-bold text-indigo-700`
32. **Update** `app/src/components/WordHistory/DayEntry.tsx`:
    - Remove `GuessHistoryRow` per-letter display `[{guess.per_letter_scores.join(', ')}]`
    - Replace with tiles showing just word + total score (same `GuessRow` component, or simplified inline tiles)
    - Style the day header card with border and rounded corners
33. **Update** `app/src/index.css` — add `body { font-family: 'Inter', system-ui, sans-serif; }` after Tailwind directives

### Phase 5 — Player Emoji *(depends on Phase 3+4 for display polish)*

34. **Update** `app/src/lib/config.ts` — add `defaultEmoji` per player: Troy `'🎯'`, Mum `'🌸'`, Dad `'⚡'`
35. **Update** `app/src/App.tsx`:
    - Extend `PlayerContextValue`: add `playerEmojis: Record<string, string>` and `setPlayerEmoji: (playerId: string, emoji: string) => Promise<void>`
    - Add `playerEmojis` state initialised from `defaultEmoji` values in `CONFIG.players`
    - Add `useEffect` on mount to fetch `data/players/profiles.json` via `readJson<Record<string,string>>()` and merge into state (S3 values override defaults)
    - `setPlayerEmoji`: update state + write full updated record back to `writeToS3('data/players/profiles.json', ...)`
36. **Update** `app/src/components/PlayerSelect/PlayerSelect.tsx` — add emoji picker below player select: grid of 24 preset emojis; selected emoji shown as large display; calls `setPlayerEmoji` on click
37. **Update** `app/src/components/shared/Header.tsx` — show `{emoji} {name}` for current player using `usePlayer`
38. **Update** `app/src/components/Lobby/PlayerStatusList.tsx` — show emoji next to each player name; use `usePlayer` for `playerEmojis`
39. **Update** `app/src/components/Puzzles/PuzzlePanel.tsx` — setter heading: `{emoji} {setterName}`; use `usePlayer` for `playerEmojis`
40. **Update** `app/src/components/Puzzles/OthersPanel.tsx` — other player name shows emoji; use `usePlayer` for `playerEmojis`
41. **Update** `app/src/components/Leaderboard/TodayTab.tsx` — `getPlayerName` → `getPlayerDisplay` using `usePlayer` emoji context
42. **Update** `app/src/components/Leaderboard/AllTimeTab.tsx` — same pattern
43. **Update** `app/src/components/Leaderboard/TrendsTab.tsx` — same pattern
44. **Update** `app/src/components/WordHistory/DayEntry.tsx` — player names in headers and labels include emoji

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. `bash scripts/backup-data.sh` → `bash scripts/delete-data.sh` → `bash scripts/restore-data.sh backups/{latest}` round-trip restores all S3 `data/` objects
4. GuessRow shows 5 letter tiles with stagger animation; no `[0, 1, 3, ...]` text visible anywhere in the app (including WordHistory)
5. PlayerSelect emoji picker appears; selecting an emoji updates immediately; emoji persists after page reload
6. Emoji appears in: Header (current player), Lobby status list, PuzzlePanel setter heading, OthersPanel player names, all Leaderboard tabs, WordHistory DayEntry
7. Mobile: no horizontal scroll; tiles fill the full screen width; tap targets ≥ 44×44px
8. `plans/release-v1.0.md` follows the standard template format

---

## Decisions & Scope

- **Phase 3+4 implemented together** — both modify `GuessRow.tsx`, avoid double-editing by doing in a single pass
- **`per_letter_scores` stays in S3 and TypeScript types** — the `GuessEntry.per_letter_scores` field is preserved in storage; only the display layer changes; historical data is not lost
- **Plan file created manually for v1.0** — this is the inception release; from v1.1 onward use `@release-agent`
- **No emoji free-text input** — preset grid of 24 emojis only; avoids invalid emoji edge cases and keeps the picker UI concise
- **`backups/` not gitignored** — backup directories must be committed to git; they are the restore point
- **`GuessHistoryRow` in `DayEntry.tsx` also updated** — hides per-letter scores in history view for consistency
- **`TrendsTab.tsx` emoji display only** — no structural changes to Recharts charts; just update player name labels in tooltips/legend
