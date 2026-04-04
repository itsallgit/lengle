# Release v1.1 — Gameplay Feedback, Social Privacy, Mobile UX, Wordle Aesthetic

## Overview

| Field | Value |
|---|---|
| Release | v1.1 |
| Branch | release/v1.1 |
| Date | 2026-04-05 |
| Status | Done |

### Summary
This release improves the core gameplay experience on four fronts: richer per-guess feedback (green/yellow/grey letter counts, à la Wordle), a simpler and fairer social panel (remove the ability to see other players' actual guesses — just show count and solved status), a mobile-first layout overhaul that removes card borders and fixes horizontal overflow, and a Wordle-style dark header / neutral colour palette replacing the current indigo branding. The nav bar is also replaced with an animated dropdown menu for cleaner mobile UX.

### Changes included
- **Agent infrastructure** — Add `@build-agent` custom agent; update release-agent handoff and workflow docs.
- **Guess colour counts** — Show 5 sorted mini squares (🟩🟨⬜) per guess to reveal how many letters are green/yellow/grey, without revealing which positions. Score pill remains but is de-emphasised.
- **Others panel simplified** — Remove the ability to view other players' actual guess words entirely. Show only name, guess count, and whether they've solved.
- **Mobile layout + card removal** — Remove rounded card wrappers from puzzle panels; fix horizontal scroll overflow on mobile; flatten the play screen layout.
- **Wordle colour scheme** — Dark header (`bg-gray-900`), neutral grey tiles (not indigo), green for correct, yellow for partial. Remove indigo/violet branding from key gameplay surfaces.
- **Animated dropdown nav** — Replace the inline nav links in the header with a hamburger-triggered animated dropdown for mobile-friendly navigation.

---

## Implementation Plan

### Phase 0 — Agent Infrastructure *(no code dependencies — agent files only)*

1. **Create** `.github/agents/build-agent.agent.md`:
   - Tools: `[read, search, edit, execute, todo]`
   - **Routine A — Plan Review & Clarification**: detect git branch → derive plan path; read plan + `.github/copilot-instructions.md` + `specs/spec-implementation.md`; read all source files named in plan steps; identify ambiguities, wrong assumptions, arch conflicts, and vague language; present numbered questions each with a bold **Recommendation**; await user confirmation; apply recommendations for any unanswered question; write resolution notes inline in the plan (`> **Resolved (Build Agent):** …`); then begin Routine B.
   - **Routine B — Continuous Implementation**: work phases in order; after each phase run `cd app && npm run typecheck && npm run lint`; fix errors and re-run until clean before proceeding; on completion summarise all changed files and prompt user to return to `@release-agent`.
   - Constraints: never run any git commands; never hardcode scoring values; never import AWS SDK directly; never prop-drill player data; no `any` types.

2. **Update** `.github/agents/release-agent.agent.md`:
   - Add `handoffs: [build-agent]` to frontmatter.
   - A7 Handoff step 3: replace "Switch to **Agent mode** in Copilot Chat" with "Use **`@build-agent`** in Copilot Chat — it will review the plan, ask clarifying questions with recommendations, and implement everything continuously".

3. **Update** `.github/copilot-instructions.md`:
   - Workflow step 2: replace "switch to **Agent mode** to implement the code changes" with "use **`@build-agent`** to implement the code changes — it reviews the plan against the real codebase, asks clarifying questions with recommendations, then implements all phases continuously and self-heals typecheck/lint errors".

### Phase 1 — Guess colour counts *(no dependencies — touches GuessRow + GuessList only)*

1. **Update** `app/src/components/Puzzles/GuessRow.tsx`:
   - Add `perLetterScores: number[]` to props (alongside existing `word` and `total`)
   - Compute counts: `green = perLetterScores.filter(s => s === CONFIG.scoring.correctPosition).length`, same for `yellow` (=== 1) and `grey` (=== 3). Import `CONFIG` from `../../lib/config`.
   - After the 5 letter tiles, render 5 small squares (`h-3 w-3 rounded-sm`) sorted green-first, then orange, then grey. Use `bg-green-500`, `bg-orange-400`, `bg-gray-200` respectively.
   - De-emphasise the score pill: reduce it to `text-xs text-gray-400 font-normal` without the coloured background. Display as a plain `(N)` after the mini squares. Remove `bg-amber-400` styling.
   - Correct guess (`total === 0`): tiles remain `bg-green-600`; all 5 mini squares are `bg-green-500`; score pill hidden (score is 0, nothing to show).

2. **Update** `app/src/components/Puzzles/GuessList.tsx`:
   - Pass `perLetterScores={entry.per_letter_scores}` to `<GuessRow />`.

### Phase 2 — Others panel simplification *(depends on nothing, but touches PuzzlePanel state shape)*

3. **Update** `app/src/components/Puzzles/PuzzlePanel.tsx`:
   - Change `othersGuesses: Record<string, GuessEntry[]>` state to `othersInfo: Record<string, { guessCount: number; solved: boolean }>` (init `{}`).
   - In `loadAll`: extract `guessCount` and `solved` from the fetched guess file instead of storing the full array. `guessCount = filtered.length`, `solved = filtered.some(g => g.is_correct)`.
   - Remove `fetchOthersGuesses` callback (no longer needed — the only reason to re-fetch on correct was to show newly-visible full history, which is removed).
   - Remove the `if (result.isCorrect) { await fetchOthersGuesses() }` call.
   - Update `<OthersPanel>` props: replace `othersGuesses={othersGuesses}` with `others={Object.entries(othersInfo).map(([id, info]) => ({ playerId: id, ...info }))}`. Remove `myGuessCount` and `isSolved` props.
   - Remove `GuessEntry` import if no longer used here.
   > **Resolved (Build Agent):** Keep `GuessEntry` import — it is still used in `handleGuessSubmit`. Remove `useCallback` import instead since `fetchOthersGuesses` is being deleted.

4. **Rewrite** `app/src/components/Puzzles/OthersPanel.tsx`:
   - New props: `others: Array<{ playerId: string; guessCount: number; solved: boolean }>`.
   > **Resolved (Build Agent):** Always render the Others section (even when guessCount is 0) — shows "0 guesses" so the current player knows others haven't started. Keep top-level collapsible toggle — users still tap "Others" to expand, then see flat player rows inside.
   - Remove all imports of `GuessList`, `GuessEntry`.
   - Keep the top-level `"Others"` collapsible toggle (same button style).
   - Inside the expanded panel, render one row per player (no sub-panel toggle needed):
     - Format: `{emoji} {name} — {N} {guess/guesses}{solved ? ' ✓' : ''}` in a `text-sm text-gray-700` div.
     - Use `usePlayer()` for `playerEmojis`; use `CONFIG.players` to get name/defaultEmoji.
   - No `GuessList` rendering anywhere.

### Phase 3 — Wordle colour scheme *(independent — touches tiles, header, and panel wrapper)*

5. **Update** `app/src/components/Puzzles/GuessRow.tsx` (in same edit as Phase 1):
   - Change non-correct tile base color from `bg-indigo-600` to `bg-gray-700`.
   - Correct tile: keep `bg-green-600` (was `bg-emerald-500`, change to `bg-green-600` for Wordle consistency).
   - Text on tiles: keep `text-white font-bold`.

6. **Update** `app/src/components/Puzzles/PuzzlePanel.tsx` (in same edit as Phase 2):
   - Remove outer wrapper classes `rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm` — replace with plain `<div>` (or `<div className="py-2">`).
   > **Resolved (Build Agent):** Use `<div className="py-2">` to preserve comfortable spacing inside each panel.
   - Loading state: same — remove card wrapper.
   - Setter heading: change `text-indigo-700` → `text-gray-900`.
   - Solved message: change `text-emerald-600` → `text-green-600`.
   - Add a thin bottom divider between puzzle panels: in `PuzzleView.tsx`, use `divide-y divide-gray-200` on the container instead of `space-y-4`.

7. **Update** `app/src/components/shared/Header.tsx`:
   - Change `bg-indigo-600` → `bg-gray-900`.
   - Change date text from `text-indigo-200` → `text-gray-400`.
   - Remove `<Nav />` from the flex row — it will be replaced in Phase 4.
   - Add a hamburger button on the right (Phase 4 will wire it up). For now: `<button aria-label="Open menu" className="text-white">☰</button>`.
   - Wrap the full header + dropdown in a `relative` positioned container so the dropdown can anchor correctly (see Phase 4).

8. **Update** `app/src/components/Puzzles/PuzzleView.tsx`:
   - Change container from `space-y-4` to `divide-y divide-gray-200` (already noted above).
   - Ensure `w-full` and no `max-w-*` constraints remain anywhere. Current code already uses `w-full px-4 py-6` — keep as-is; just confirm no inner constraint is causing overflow.

9. **Update** `app/src/index.css`:
   - Add `html, body { background-color: #ffffff; }` after the `font-family` line to ensure a clean white background.

10. **Update** `app/src/components/PlayerSelect/PlayerSelect.tsx`:
    - Change gradient `from-indigo-600 to-violet-600` → `from-gray-800 to-gray-900`.
    - Button and card accent colors: change any `indigo`/`violet` to `gray-900` or `green-600`.
    > **Resolved (Build Agent):** Play button uses `bg-gray-900 hover:bg-gray-800`. Title `text-indigo-700` → `text-gray-900`. All border/focus/picker accents become neutral gray equivalents (e.g. `border-gray-200`, `focus:border-gray-500`, `ring-gray-200`).

11. **Update** `app/src/components/Lobby/Lobby.tsx` and `app/src/components/Lobby/PlayerStatusList.tsx`:
    - Replace `border-emerald-200 bg-emerald-50 text-emerald-800` with `border-green-200 bg-green-50 text-green-800` for submitted rows.
    - Replace any remaining `indigo` heading/button colors with `gray-900` or `green-600`.

12. **Update** `app/src/components/Leaderboard/Leaderboard.tsx`:
    - Tab bar: change `border-b-2 border-white text-white` active tab and `bg-indigo-600` sub-header background to match `bg-gray-900` dark header.

### Phase 4 — Animated dropdown nav *(depends on Phase 3 Header changes)*

13. **Rewrite** `app/src/components/shared/Nav.tsx`:
    - Remove the flat link row.
    - Export a **`NavMenu`** component with:
      - Internal `open` state (`useState(false)`).
      - A `useEffect` watching `pathname` (from `useLocation`) that closes the menu on route change.
      - A hamburger toggle button: `☰` when closed, `✕` when open; `className="text-white text-xl font-bold p-1"`.
      - A dropdown panel: `absolute top-full right-0 w-48 bg-gray-900 border border-gray-700 rounded-b-lg shadow-lg z-50`; CSS slide-down animation using `overflow-hidden transition-all duration-200 ease-in-out` with `max-h-0` (closed) → `max-h-48` (open) toggling. Do **not** use conditional render — the element must stay in the DOM for the transition to play.
      - Inside the dropdown: stacked nav links, `py-2 px-4` each, `text-sm text-gray-200 hover:text-white hover:bg-gray-800 block`.
      - Active link: `font-bold text-white bg-gray-700`.

14. **Update** `app/src/components/shared/Header.tsx`:
    - The header wrapper should be `relative` so the dropdown can absolutely position below it.
    - Import and render `<NavMenu />` (replacing the old `<Nav />`).
    - Final structure: `<header className="bg-gray-900 px-4 py-3 shadow-md relative">` containing a flex row with date left and `<NavMenu />` right.

### Phase 5 — Spec updates *(after code changes confirm behaviour)*

15. **Update** `specs/spec-game-design.md`:
    - **§5.4 Score Display**: Replace current rule ("only total score displayed, no colour coding") with new rule: each guess shows (1) 5 sorted mini colour indicators — green squares for correct-position letters, yellow for correct-letter-wrong-position, grey for not-in-word — and (2) the total numeric score displayed in a de-emphasised secondary style. Remove "No colour coding is used anywhere" sentence.
    - **§7.1 Visibility Rule**: Remove the "up to N guesses" rule entirely. New rule: other players' actual guesses are never visible. Only the total guess count is shown.
    - **§7.2 Post-Solve Visibility**: Remove this section (no longer applicable).
    - **§7.3 Display**: Update — the "Others" section shows a non-expandable list of other players with name, emoji, guess count, and a solved indicator (✓). No guess words or scores are shown.
    - **Acceptance Criteria table**: Remove AC-09 and AC-11 (guess visibility rules). Update AC-18 to reflect new color count display.

---

## Verification

1. `@build-agent` appears in the Copilot Chat agent picker
2. Launching `@build-agent` on `release/v1.1` auto-reads this plan and presents questions with recommendations — no manual file attachment needed
3. release-agent A7 Handoff message references `@build-agent` by name
4. `cd app && npm run typecheck` — zero errors
5. `cd app && npm run lint` — zero errors
6. On mobile (375px viewport): no horizontal scroll on any screen; puzzle panels fill full width with no card borders
4. Each guess row shows 5 mini colored squares + a de-emphasised score; correct guesses show all-green squares; no amber pill visible
5. "Others" section shows player name + guess count + ✓ solved indicator only — no guess words are visible under any combination of solved/unsolved states
6. Header is dark (`bg-gray-900`); tiles are `bg-gray-700` for unresolved guesses; correct tiles are `bg-green-600`
7. Nav hamburger appears in header; tapping opens animated dropdown with all 4 nav links; tapping a link navigates and closes the menu

---

## Decisions & Scope

- **WordHistory DayEntry** uses its own inline `GuessHistoryRow` (not the Puzzles `GuessRow`) and shows historical guesses to the player about their own history. This is intentionally left unchanged — the color count feature applies to active play only (history is for reviewing your own past performance, not competing).
- **Score is kept** on each guess, but de-emphasised (plain text, no pill background). Removing it entirely is out of scope for this release.
- **Nav dropdown uses CSS `max-height` transition** (`max-h-0` → `max-h-48`, `duration-200 ease-in-out`). The dropdown `<div>` must always be in the DOM (not conditionally rendered) for the slide animation to work.
- **Leaderboard and History colour sweep** is a best-effort update of indigo accents; functional layout of those screens is not changed.
- **AC-09 / AC-11 complexity removed** — the game is now simpler and fairer. The spec is updated to reflect this. The S3 guess data still stores full guess history (no schema changes needed); the app just chooses not to display it.
