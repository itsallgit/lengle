# Release v1.3 — Puzzle Card Layout, History Tiles, and Guess Persistence Fix

## Overview

| Field | Value |
|---|---|
| Release | v1.3 |
| Branch | release/v1.3 |
| Date | 2026-04-05 |
| Status | Done |

### Summary
This release addresses usability and visual polish issues found during live testing of v1.2. The most critical fix is a guess persistence bug caused by browser fetch caching silently overwriting S3 guess files. The visual changes complete the accordion puzzle panel redesign (styled dark header cards vs light body), update Word History to show the answer word as green tiles, and clean up the navbar date and page label.

### Changes included
- **S3 fetch caching bug fix** — `readJson` must use `cache: 'no-store'` so guess files are never read from the browser cache before writing, which was silently overwriting all previous guesses
- **Puzzle panels — card layout with dark header** — Each panel becomes a card with a dark gray (`bg-gray-900`) clickable header, clearly separated from the white body; removes the `divide-y` horizontal lines from PuzzleView
- **Others button bottom spacing** — Add bottom padding to the accordion body so the Others panel doesn't flush against the card edge
- **Guess input auto-refocus fix** — Replace the broken `requestAnimationFrame` approach with a `useEffect` that watches the `disabled` prop; focus fires when submission completes (disabled → enabled transition)
- **Header date — remove year** — Shorten the date in the header bar
- **Header page label — larger and bolder** — Make the centered page title more prominent
- **Word History — puzzle word as green tiles** — Show the revealed answer word using the same green tile visual as the play screen, replacing plain monospace text

---

## Implementation Plan

### Phase 1 — Critical bug fix (do first, independent of all other changes)

**Step 1.1 — Fix S3 fetch caching** (`app/src/lib/s3.ts`)

Root cause: `readJson` calls `fetch(url)` with no cache directive. The S3 website endpoint serves guess files with no `Cache-Control` header, so the browser uses heuristic caching based on `Last-Modified`. When `handleGuessSubmit` calls `readJson` to read the current guess file before appending, the browser returns the cached (stale) version — typically the one from the initial page load. Every new guess therefore gets appended to the stale version and written back, overwriting all guesses since the initial load. This is why the user sees only "1 guess" after multiple submissions.

Fix: add `cache: 'no-store'` to the fetch call so every `readJson` call bypasses the browser cache:

```ts
const response = await fetch(url, { cache: 'no-store' })
```

This is safe because all immutable static app assets (JS/CSS) use content-hashed filenames and are served from `dist/`, not via `readJson`. Only game data goes through `readJson`.

### Phase 2 — Header tweaks (independent)

**Step 2.1 — Remove year and enlarge page label** (`app/src/components/shared/Header.tsx`)

- Remove `year: 'numeric'` from the `toLocaleDateString` options object — date becomes e.g. "Saturday, 5 April"
- Change the page label span from `text-sm font-semibold text-white` to `text-base font-bold text-white`

### Phase 3 — Puzzle card layout (depends on nothing)

**Step 3.1 — PuzzleView container** (`app/src/components/Puzzles/PuzzleView.tsx`)

- Change `divide-y divide-gray-200` on the inner container div to `space-y-4` — panels are now spaced cards rather than horizontally divided regions

**Step 3.2 — PuzzlePanel card styling** (`app/src/components/Puzzles/PuzzlePanel.tsx`)

The outer `<div>` becomes a card shell:
```tsx
<div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
```

The loading state header button:
```tsx
<button
  type="button"
  className="flex w-full items-center justify-between bg-gray-900 px-4 py-4 text-left"
  disabled
>
  <span className="text-lg font-bold text-white">Loading…</span>
</button>
```

The accordion header button:
```tsx
<button
  type="button"
  onClick={() => setExpanded((v) => !v)}
  className="flex w-full items-center justify-between bg-gray-900 px-4 py-4 text-left"
  aria-expanded={expanded}
>
  <span className="text-lg font-bold text-white">{setterName}&apos;s word</span>
  <div className="flex items-center gap-3">
    {isSolved
      ? <span className="text-sm text-green-400 font-semibold">✓ {myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'}</span>
      : myGuesses.length > 0
        ? <span className="text-sm text-gray-400">{myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'}</span>
        : null
    }
    <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
  </div>
</button>
```

The accordion body div — add `bg-white px-4 pt-4 pb-4` so content is padded within the card and has bottom spacing (also fixes the Others button bottom gap):
```tsx
<div
  className={`bg-white overflow-hidden transition-all duration-200 ease-in-out ${
    expanded ? 'max-h-[2000px]' : 'max-h-0'
  }`}
>
  <div className="px-4 pt-4 pb-4">
    {/* existing body content */}
  </div>
</div>
```

### Phase 4 — Guess input auto-refocus fix (independent of Phase 3)

**Step 4.1 — Fix auto-refocus** (`app/src/components/Puzzles/GuessInput.tsx`)

The v1.2 `requestAnimationFrame` approach doesn't work because by the time the RAF fires, the input is `disabled={isSubmitting}` — `.focus()` on a disabled element has no effect.

Fix: add `useEffect` (add to import) and watch `disabled` prop. When it transitions from `true` to `false` (submission completes), focus the input:

```tsx
import { useEffect, useRef, useState } from 'react'
```

Inside the component, after the existing `inputRef` declaration:
```tsx
const prevDisabled = useRef(disabled)
useEffect(() => {
  if (prevDisabled.current && !disabled) {
    inputRef.current?.focus()
  }
  prevDisabled.current = disabled
}, [disabled])
```

Remove the `requestAnimationFrame` call from `handleSubmit` — it is no longer needed.

### Phase 5 — Word History tiles (independent)

**Step 5.1 — Add WordTilesDisplay to DayEntry** (`app/src/components/WordHistory/DayEntry.tsx`)

Add a private component above `DayEntry` export:
```tsx
function WordTilesDisplay({ word }: { word: string }) {
  return (
    <div className="my-2 flex gap-1">
      {word.split('').map((letter, i) => (
        <div
          key={i}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-sm font-bold text-white"
        >
          {letter}
        </div>
      ))}
    </div>
  )
}
```

In the existing setter block inside the expanded section, replace:
```tsx
<p className="text-sm font-semibold text-gray-900">
  {getPlayerDisplay(setter.id)}&apos;s word:{' '}
  {wordFile ? (
    <span className="font-mono tracking-widest">
      {wordFile.word}
    </span>
  ) : (
    <span className="italic text-gray-400">unknown</span>
  )}
</p>
```

With:
```tsx
<p className="text-sm font-semibold text-gray-900">
  {getPlayerDisplay(setter.id)}&apos;s word
</p>
{wordFile ? (
  <WordTilesDisplay word={wordFile.word} />
) : (
  <p className="mt-1 text-xs italic text-gray-400">unknown</p>
)}
```

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. **Guess persistence bug**: Submit 3+ guesses for a puzzle, navigate away to Lobby and back to Play — all guesses must still be visible and the count must be correct
4. **Header**: Date shows without year (e.g. "Saturday, 5 April"); page title is larger and bold
5. **Puzzle panels**: Each panel renders as a rounded card with dark gray header and white body; header is visually distinct and obviously clickable; no horizontal divider lines between panels
6. **Others button bottom spacing**: The Others pill button and its expanded list do not flush against the bottom edge of the card
7. **Guess input refocus**: After submitting a valid guess, focus returns to the input automatically once isSubmitting goes back to false (keyboard stays up on mobile)
8. **Word History**: Each setter's answer word renders as a row of green tiles, not plain monospace text

## Decisions & Scope

- **`cache: 'no-store'` on all `readJson` calls**: This is the correct fix. Data files are small and always need to be fresh. Immutable assets (JS/CSS) are served from `dist/` with content-hashed names — they never go through `readJson`.
- **Card header color `bg-gray-900`**: Matches the app's main nav color for visual consistency. White text on dark makes the header button unmistakably interactive.
- **Tile size `h-8 w-8` in history**: Smaller than the play screen (`h-12 w-12`) to fit comfortably in the history card without dominating. No tile-pop animation in history (would be distracting when scrolling multiple days).
- **refocus via `useEffect` watching `disabled`**: More reliable than `requestAnimationFrame` because it fires exactly when the async submission completes, not at an arbitrary point in the next paint cycle.
- **Year removal from header date**: The date is already shown in context (game date); year adds noise. It can always be inferred.
