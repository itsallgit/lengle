# Release v1.10 — Bug fixes: play button, tile working restore, player column width

## Overview

| Field | Value |
|---|---|
| Release | v1.10 |
| Branch | release/v1.10 |
| Date | 2026-04-07 |
| Status | Done |

### Summary
Fixes three bugs found in v1.9 production play. Removes the disabled state from the "Play Today's Puzzles" button on the home screen, fixes tile colour overrides not being restored when returning to a completed puzzle, and widens the player name column on the past puzzles page to prevent text wrapping.

### Changes included
- Remove disabled button logic from home screen — always show an enabled "Play Today's Puzzles" button once the current player has set their word
- Fix tile override working not being saved/restored correctly after puzzle completion — pad override rows to cover all guesses before saving the solve snapshot
- Widen the player name column in DayEntry to prevent emoji + name wrapping onto two lines

---

## Implementation Plan

All three changes are independent and can be done in any order or in parallel.

### Phase 1 — Remove disabled button on home screen (`Lobby.tsx`)

**File:** `app/src/components/Lobby/Lobby.tsx`

The current code renders two separate sections based on `lobbyState`:
- State `'B'` (player has set word, waiting for others): shows a `disabled` button labelled "Waiting for others…"
- State `'C'` (all words set): shows an enabled "Play Today's Puzzles" button

**Change:** Merge these two sections into a single section that renders when `!loading && lobbyState !== 'A'`. The button should always be enabled and navigate to `/play`. Keep a context-appropriate subtitle:

- When `lobbyState === 'B'`: subtitle stays as the "Waiting for X to set their word…" message — or simplify to a neutral line. The button itself should read "Play Today's Puzzles" and be enabled.
- When `lobbyState === 'C'`: subtitle "All words are set — let's play!"

The simplest approach: replace both the state B block and the state C block with one block:

```tsx
{!loading && lobbyState !== 'A' && (
  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
    <div>
      <h2 className="text-base font-bold text-gray-900">Today's Puzzles</h2>
      {lobbyState === 'C' ? (
        <p className="mt-1 text-xs text-gray-500">All words are set — let's play!</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">
          Waiting for{' '}
          {pendingPlayers.map((p, i) => (
            <span key={p.id}>
              <span className="font-semibold">
                {CONFIG.players.find(cp => cp.id === p.id)?.name}
              </span>
              {i < pendingPlayers.length - 1 ? ' and ' : ''}
            </span>
          ))}{' '}
          to set their word…
        </p>
      )}
    </div>
    <button
      onClick={() => navigate('/play')}
      className="w-full rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800"
    >
      Play Today's Puzzles
    </button>
  </section>
)}
```

Remove the old separate state B and state C blocks entirely.

Also remove the `bothWordsSet` variable if it becomes unused after this change (check if it's still referenced elsewhere in the file).

---

### Phase 2 — Fix tile working not saved/restored after puzzle completion (`GuessList.tsx`)

**File:** `app/src/components/Puzzles/GuessList.tsx`

**Root cause:** When the puzzle is solved by submitting a correct guess, the following sequence happens in a single React render commit:
1. `guesses` is updated to include the correct (final) guess → `guesses.length` increases by 1
2. The `useEffect` on `[guesses.length, guesses]` (which appends a null row to `overrides`) fires
3. The `useEffect` on `[isSolved]` fires and calls `onSolveSnapshot(overrides, guesses.length)`

The problem: both effects run in the same commit batch. When the solve effect fires, it captures `overrides` from the last render — which still has `n - 1` rows (before the new null row was appended by the other effect). So `onSolveSnapshot` is called with `overrides.length === guesses.length - 1`.

When the saved working is later loaded back, `initialOverrides.length !== guesses.length`, so the `useState` initialiser in `GuessList` falls back to all-null overrides, discarding the saved tile colours.

**Change:** In the `isSolved` effect, pad `overrides` to cover all guesses before calling `onSolveSnapshot`. This ensures the saved working always has exactly `guesses.length` rows, so the load path initialises correctly.

Current code in `GuessList.tsx` (approx. lines 35–42):
```ts
useEffect(() => {
  if (isSolved && !wasSolvedRef.current) {
    wasSolvedRef.current = true
    onSolveSnapshot?.(overrides, guesses.length)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isSolved])
```

Change to:
```ts
useEffect(() => {
  if (isSolved && !wasSolvedRef.current) {
    wasSolvedRef.current = true
    const paddedOverrides = guesses.map((g, i) =>
      overrides[i] ?? Array(g.word.length).fill(null),
    )
    onSolveSnapshot?.(paddedOverrides, guesses.length)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isSolved])
```

No other files need to change for this fix. The load path in `PuzzlePanel.tsx` is already correct — it renders `GuessList` only after `isLoading` is false (via early return), so the `useState` initialiser always runs with the fully-loaded `savedOverrides` and `myGuesses`.

---

### Phase 3 — Widen player column in past puzzles page (`DayEntry.tsx`)

**File:** `app/src/components/WordHistory/DayEntry.tsx`

The player name cells currently use `className="w-36 ..."` (9 rem / 144 px). When an emoji + name is longer than the column, the text wraps so the name appears below the emoji on a second line.

**Change:** Add `whitespace-nowrap` to both player name `<td>` elements and increase the fixed width to `w-44` (11 rem / 176 px). The second column has no width constraint so it will fill the remaining space automatically.

There are two `<td>` elements to update:

1. Setter row (row 1):
```tsx
// Before:
<td className="w-36 py-2 align-middle text-sm font-semibold text-gray-700">
// After:
<td className="w-44 whitespace-nowrap py-2 align-middle text-sm font-semibold text-gray-700">
```

2. Guesser rows (rows 2+):
```tsx
// Before:
<td className="w-36 py-1.5 font-medium text-gray-700">
// After:
<td className="w-44 whitespace-nowrap py-1.5 font-medium text-gray-700">
```

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. Manual — Home screen, state B: confirm "Play Today's Puzzles" button is visible and clickable even when not all players have set words
4. Manual — Home screen, state A: confirm the set-word form still shows; play button is not shown yet
5. Manual — Complete a puzzle with manually-set tile colours, navigate to home, return to play page — confirm tile colours are preserved
6. Manual — Past puzzles page: confirm player names and emojis appear on a single line with no wrapping

## Decisions & Scope

- The "Waiting for others" message text is preserved in the merged state B/C section so users still know why some puzzles may not be playable yet.
- The `bothWordsSet` variable and its associated `<p>✅ Words set...` display remain unchanged — they handle the word-setting CTA (Bug 1 only affects the play button section).
- The fix for Bug 2 is minimal: one local variable in the `isSolved` effect. No changes to the `handleSolveSnapshot` function in `PuzzlePanel.tsx` or the load path.
- `w-44` (176 px) is chosen as a reasonable fixed width for the player column; if player names are longer in future, this can be increased again.
- Out of scope: any other Lobby UX changes; re-investigating the root cause of why status.unlocked was false when all words were set.
