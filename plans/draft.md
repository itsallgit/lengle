# Draft Plan — Puzzle Word Summary Section (Today Tab)

## Overview

Add a new **Puzzle Words** summary section to the Today tab on the Scores page. The section sits directly below the existing Daily Scores table (the Player / Guesses / Points table) and above the per-puzzle detail cards.

It displays one row per player. Each row shows the player's name alongside their puzzle word for the day — either revealed in full or hidden behind question tiles, depending on whether all players have solved that word yet.

**Why:** This is a small visual experiment. Before committing the feature to the v1.13 release, the goal is to deploy it to the non-production environment first — see how it feels in context on a real device, confirm the reveal logic looks right, and decide whether it belongs in the final release.

---

## Acceptance Criteria

1. **Section presence** — A new Puzzle Words section is visible on the Today tab, positioned below the Daily Scores table and above the first per-puzzle card.

2. **One row per player** — Every player appears exactly once in the section, regardless of how many puzzles have been played or how many have been solved.

3. **Word revealed — all solved** — For a given player's word, if every other player has correctly guessed it, the word is shown as green letter tiles (matching the style already used in the per-puzzle cards when a puzzle is fully solved).

4. **Word hidden — not all solved** — For a given player's word, if at least one player has not yet solved it, the word is replaced by question-mark tiles in the same grey masked style currently used in the per-puzzle cards.

5. **Consistent tile style** — The revealed (green) and hidden (grey question) tile styles in this new section are visually identical to those already used in the per-puzzle cards directly below. No new visual patterns are introduced.

6. **No backend change** — The section uses only data the page already loads. No new API calls, data files, or schema changes are needed.

7. **Scope is Today tab only** — No other tabs, pages, or components are affected.

---

## Verification

### User Testing

Deploy to non-prod and check the following manually:

1. **Layout** — Open the Scores page → Today tab. Confirm the Puzzle Words section appears between the Daily Scores table and the first per-puzzle card. Confirm it does not disrupt the existing layout on mobile.

2. **Hidden state** — While at least one puzzle is unsolved for the day, confirm each unsolved player's row shows grey question-mark tiles (not the actual word).

3. **Revealed state** — Once all players have solved a particular word, confirm that word's row switches to green letter tiles showing the actual word.

4. **All revealed** — When all puzzles are fully solved for the day, confirm every row shows green tiles with the correct words.

5. **Visual consistency** — Compare the tile appearance in this new section against the tiles already shown in the per-puzzle cards below. They should look identical in size, shape, colour, and spacing.

6. **No regressions** — Confirm the Daily Scores table, the per-puzzle cards, and the Leaders/waiting banner above all continue to render and behave exactly as before.

---

## Scope Notes

- **Today tab only.** The All-Time tab, Leaderboard, Word History, and Play screens are out of scope.
- **No backend changes.** All data needed (puzzle words and guess outcomes per player) is already fetched by the Today tab.
- **Experiment.** This feature is being tested in non-prod before being confirmed for the v1.13 release. It may be dropped, adjusted, or merged depending on how it looks.

---

## Technical Implementation

### Overview

All changes are confined to a **single file**: `app/src/components/Leaderboard/TodayTab.tsx`.

No new files, components, types, API calls, data fetches, or spec changes are required.

All data needed to render the new section (`puzzleStats`, `WordTilesDisplay`, `HiddenWordDisplay`) is already computed and available at the point of insertion in the existing render tree.

---

### Architecture Context

**Relevant data already loaded by `TodayTab`:**

| Variable | Type | Source | Used for |
|---|---|---|---|
| `puzzleStats` | `PuzzleStats[]` | Computed from `playerGuesses` + `puzzleWords` | One entry per setter: contains `setterId`, `setterDisplay`, `allSolved: boolean`, `word: string \| null` |
| `WordTilesDisplay` | React component | Defined at top of `TodayTab.tsx` | Green `h-8 w-8 bg-green-600` tiles — one per letter |
| `HiddenWordDisplay` | React component | Defined at top of `TodayTab.tsx` | Grey `h-8 w-8 bg-gray-300` `?` tiles — `CONFIG.wordLength` tiles |

**Reveal logic (already computed in `puzzleStats`):**

```
puzzleStats[i].allSolved === true  →  puzzle.word is the actual word string
puzzleStats[i].allSolved === false →  puzzle.word is null
```

`allSolved` is `true` when every other player has a correct guess (`is_correct: true`) recorded in their guesses file for that setter's puzzle. This already exactly matches acceptance criteria 3 and 4.

---

### Phase 1 — Insert the Puzzle Words card in TodayTab.tsx

**File:** `app/src/components/Leaderboard/TodayTab.tsx`

**Change:** Insert a new JSX block in the return statement, between the closing `</div>` of the Daily Scores table card and the opening of the `{/* Per-puzzle sections */}` comment block.

**New JSX to insert:**

```tsx
{/* Puzzle Words summary */}
<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
  <h2 className="mb-3 text-sm font-bold text-gray-900">Puzzle Words</h2>
  <div className="space-y-1">
    {puzzleStats.map((puzzle) => (
      <div key={puzzle.setterId} className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-sm font-medium text-gray-900">
          {puzzle.setterDisplay}
        </span>
        {puzzle.allSolved && puzzle.word ? (
          <WordTilesDisplay word={puzzle.word} />
        ) : (
          <HiddenWordDisplay />
        )}
      </div>
    ))}
  </div>
</div>
```

**Notes:**
- `rounded-xl border border-gray-100 bg-white p-4 shadow-sm` — matches the existing per-puzzle cards exactly (same classes used on every card in this file).
- `text-sm font-bold text-gray-900` on `<h2>` — matches the sub-heading convention in spec-ux-design.md §6.
- `w-24 shrink-0` on the player name span — reserves a fixed 96px column so tile rows are horizontally aligned across all players. `shrink-0` prevents the name truncating when tiles extend further right.
- `space-y-1` on the row container — provides a small vertical gap between player rows without adding excessive whitespace.
- `WordTilesDisplay` and `HiddenWordDisplay` are called unchanged — their `my-2 flex gap-1` outer class and `h-8 w-8 rounded-md` tile classes are identical to those in the per-puzzle cards. No new visual patterns.
- The insertion point is **after** the closing `</div>` of the Daily Scores card and **before** the `{puzzleStats.map(...)}` block for per-puzzle sections. This places the section exactly between those two blocks as required by acceptance criterion 1.

---

### Phase 2 — Verify render order

After the edit, the return JSX order in `TodayTab` must be:

1. Leaders grid / "not all completed" amber banner
2. Daily Scores table card ← **existing**
3. **Puzzle Words summary card** ← **new**
4. Per-puzzle detail cards (one per player) ← **existing**
5. Footer note ("Updates as players complete…") ← **existing**

No other sections move.

---

### Exact insertion point

In `TodayTab.tsx`, locate this comment immediately before the per-puzzle map:

```tsx
      {/* Per-puzzle sections */}
      {puzzleStats.map((puzzle) => (
```

Insert the new `{/* Puzzle Words summary */}` block **immediately above** this comment.

---

### No other files change

| File | Change |
|---|---|
| `app/src/components/Leaderboard/TodayTab.tsx` | Insert Puzzle Words card JSX block |
| All other files | No change |

---

## Verification

### Technical Verification

1. **TypeScript** — `puzzle.word` is typed `string | null` in `PuzzleStats`. The conditional `puzzle.allSolved && puzzle.word` narrows it to `string` before passing to `WordTilesDisplay`. No type errors expected.

2. **Build** — Run `npm run build` from `app/` and confirm zero errors. The change is JSX-only with no new imports or exports.

3. **Lint** — Run `npm run lint` from `app/` and confirm zero new warnings.

4. **Visual** — Deploy to non-prod and follow the User Testing steps above.

---

## Decisions & Scope

| Decision | Choice | Rationale |
|---|---|---|
| New file vs. inline JSX | Inline JSX in `TodayTab.tsx` | The section is small (< 20 lines), uses only locally-scoped data, and extracting it to a separate file would add indirection with no benefit at this scale. |
| Player name column width | `w-24 shrink-0` (96px fixed) | Aligns tile rows horizontally across all players. Fits "🎯 Troy", "🌸 Mum", "⚡ Dad" comfortably. If a player name is longer, the flex row naturally wraps rather than clipping. |
| Reveal logic | Reuse `puzzleStats[i].allSolved` and `puzzleStats[i].word` | Already computed from the same guesses data. Avoids duplicating logic. |
| Tile style | Reuse `WordTilesDisplay` / `HiddenWordDisplay` unchanged | Acceptance criterion 5 requires visual identity with per-puzzle cards. Reusing the same components guarantees this. |
| Section heading | "Puzzle Words" | Short, descriptive, consistent with the informal "Fewest Guesses" / "Most Points" label style elsewhere on the tab. |
