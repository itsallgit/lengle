# Release v1.2 — UI Polish, Accordion Puzzles, and Interaction Fixes

## Overview

| Field | Value |
|---|---|
| Release | v1.2 |
| Branch | release/v1.2 |
| Date | 2026-04-05 |
| Status | In Progress |

### Summary
This release focuses on polish across the core play experience. The two biggest changes are restructuring the puzzle screen into proper accordion panels (expanding/collapsing per setter) and fixing the guess input to auto-refocus after submission. The remaining changes address visual inconsistencies: a spurious bottom border in the nav dropdown, an undiscoverable "Others" toggle, stacked colour-per-row squares replacing the flat strip, sticky header, score brackets removal, and leftover indigo text across Word History and other screens.

### Changes included
- **Navbar border fix + current page indicator** — Remove visible border on collapsed dropdown; show current page name in the header bar
- **Others button redesign** — Style the Others collapsible as a proper tappable pill/card
- **Accordion puzzle panels** — Each setter panel becomes an expand/collapse accordion with full-width header button
- **Auto-refocus guess input** — After submitting a guess, the text input automatically re-focuses (keyboard stays up on mobile)
- **Hide score in brackets** — Remove the faint `(N)` score text from each guess row
- **Stacked mini squares** — Replace horizontal colour strip with 3 stacked rows: green row / yellow row / grey row
- **Sticky header** — Header sticks to top of viewport as page scrolls
- **Word History + remaining indigo colour cleanup** — `text-indigo-700` remaining in WordHistory.tsx, TodayTab.tsx, GuessInput.tsx submit button, and WordSetForm.tsx

---

## Implementation Plan

### Phase 1 — Quick wins (independent, no structural dependencies)

**Step 1.1 — Remove score brackets** (`app/src/components/Puzzles/GuessRow.tsx`)
- Remove the entire `{!isCorrect && (<span className="text-xs text-gray-400 font-normal">({total})</span>)}` block
- Remove the `total` prop from `GuessRowProps` — it is no longer needed in the render output
- Note: `total` is still used to compute `isCorrect` (`total === 0`). Keep `total` in props but remove the render-only usage

**Step 1.2 — Stacked mini squares** (`app/src/components/Puzzles/GuessRow.tsx`, same edit as 1.1)
- Replace the horizontal `miniSquares` array + single `div.flex.gap-0.5` with three conditional row divs:
  ```tsx
  <div className="flex flex-col gap-0.5">
    {green > 0 && (
      <div className="flex gap-0.5">
        {Array.from({ length: green }).map((_, i) => (
          <div key={i} className="h-3 w-3 rounded-sm bg-green-500" />
        ))}
      </div>
    )}
    {yellow > 0 && (
      <div className="flex gap-0.5">
        {Array.from({ length: yellow }).map((_, i) => (
          <div key={i} className="h-3 w-3 rounded-sm bg-orange-400" />
        ))}
      </div>
    )}
    {grey > 0 && (
      <div className="flex gap-0.5">
        {Array.from({ length: grey }).map((_, i) => (
          <div key={i} className="h-3 w-3 rounded-sm bg-gray-200" />
        ))}
      </div>
    )}
  </div>
  ```
- Remove the `miniSquares: string[]` array — it is no longer needed

**Step 1.3 — Sticky header** (`app/src/components/shared/Header.tsx`)
- Change outer `<div className="relative">` to `<div className="sticky top-0 z-40">`
- Move `bg-gray-900` and `shadow-md` from `<header>` to the outer div, so: `<div className="sticky top-0 z-40 bg-gray-900 shadow-md">` and the inner `<header>` becomes just `<header className="px-4 py-3">`

**Step 1.4 — Remaining indigo cleanup** (multiple files)
- `app/src/components/WordHistory/WordHistory.tsx`: `text-indigo-700` → `text-gray-900` on the `<h1>Leaderboard</h1>` heading (line ~90)
- `app/src/components/Leaderboard/TodayTab.tsx`: find all `text-indigo-700` instances and replace with `text-gray-900`
- `app/src/components/Puzzles/GuessInput.tsx`: update indigo input/button colours to match gray-900 scheme:
  - Input: `border-indigo-200` → `border-gray-200`, `text-indigo-900` → `text-gray-900`, `placeholder-indigo-300` → `placeholder-gray-400`, `focus:border-indigo-500` → `focus:border-gray-500`, `focus:ring-indigo-200` → `focus:ring-gray-200`
  - Button: `bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400` → `bg-gray-900 hover:bg-gray-800 focus:ring-gray-700`
- `app/src/components/Lobby/WordSetForm.tsx`: `focus:border-indigo-500 focus:ring-indigo-500` → `focus:border-gray-500 focus:ring-gray-500`; `bg-indigo-600 hover:bg-indigo-700` → `bg-gray-900 hover:bg-gray-800`

### Phase 2 — Navbar fixes (depends on nothing)

**Step 2.1 — Fix dropdown border** (`app/src/components/shared/Nav.tsx`)
- On the dropdown container div, remove `border border-gray-700` and replace with conditional border that only shows when open:
  - Change: `border border-gray-700` → `border-gray-700 ${open ? 'border' : ''}`
  - Or cleaner: use `ring` instead of `border` which doesn't affect layout when hidden with `max-h-0`

**Step 2.2 — Current page indicator in header** (`app/src/components/shared/Nav.tsx` + `app/src/components/shared/Header.tsx`)
- In `Nav.tsx`, export a named hook or helper `useCurrentPageLabel()` that maps `pathname` to a label string using the `NAV_LINKS` array
- In `Header.tsx`, import `useCurrentPageLabel` and render the current page name in the header bar between the date and the `<NavMenu />`:
  - Layout: `<span className="text-sm font-medium text-gray-400">{formatted}</span>` (date, left) | `<span className="text-sm font-semibold text-white">{pageLabel}</span>` (page name, center) | `<NavMenu />` (right)
  - Or: date on left, NavMenu on right, page label rendered between them as `absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white` for a centered title in the header

### Phase 3 — Others button redesign (independent of accordion changes)

**Step 3.1 — OthersPanel button style** (`app/src/components/Puzzles/OthersPanel.tsx`)
- Remove the `border-t border-gray-200 mt-3 pt-3` wrapper — the accordion in Phase 4 will provide spacing between the guess area and Others
- Replace current plain button with a pill-style tappable row:
  ```tsx
  <button
    type="button"
    onClick={() => setOpen((v) => !v)}
    className="mt-4 flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-2.5 hover:bg-gray-200 active:bg-gray-300"
    aria-expanded={open}
  >
    <span className="text-sm font-medium text-gray-700">Others</span>
    <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
  </button>
  ```

### Phase 4 — Accordion puzzle panels (depends on Phase 3 being done first)

**Step 4.1 — Restructure PuzzlePanel** (`app/src/components/Puzzles/PuzzlePanel.tsx`)

The panel must be restructured from a flat `<div>` into an accordion. The header button is always visible; the body animates open/closed.

- Add `const [expanded, setExpanded] = useState(true)` — default open (both panels start expanded)
- The accordion header button (always rendered):
  ```tsx
  <button
    type="button"
    onClick={() => setExpanded((v) => !v)}
    className="flex w-full items-center justify-between py-4 text-left"
    aria-expanded={expanded}
  >
    <span className="text-lg font-bold text-gray-900">{setterName}&apos;s word</span>
    <div className="flex items-center gap-3">
      {isSolved
        ? <span className="text-sm text-green-600 font-semibold">✓ {myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'}</span>
        : myGuesses.length > 0
          ? <span className="text-sm text-gray-500">{myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'}</span>
          : null
      }
      <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
    </div>
  </button>
  ```
- The collapsible body (animated via `max-h` transition):
  ```tsx
  <div
    className={`overflow-hidden transition-all duration-200 ease-in-out ${
      expanded ? 'max-h-[2000px]' : 'max-h-0'
    }`}
  >
    {/* word reveal when solved */}
    {isSolved && targetWord && (
      <p className="mb-3 font-mono tracking-widest text-green-600 text-lg">{targetWord}</p>
    )}
    <GuessList guesses={myGuesses} />
    <div className="mt-4">
      {isSolved ? (
        <p className="font-semibold text-green-600">
          Solved in {myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'} 🎉
        </p>
      ) : (
        <GuessInput ... />
      )}
    </div>
    <OthersPanel ... />
  </div>
  ```
- The loading state is also wrapped in accordion structure (header shows "Loading…", body hidden)
- The outer `<div className="py-2">` becomes just `<div>` — accordion header provides its own vertical padding via `py-4`

**Step 4.2 — Update PuzzleView** (`app/src/components/Puzzles/PuzzleView.tsx`)
- Change the container from `divide-y divide-gray-200` to `divide-y divide-gray-200` — kept, as the accordion header buttons will be separated by the divider lines, which looks correct
- No other changes needed — PuzzlePanel handles its own layout

### Phase 5 — Auto-refocus guess input (independent)

**Step 5.1 — GuessInput auto-focus** (`app/src/components/Puzzles/GuessInput.tsx`)
- Add `import { useRef, useState } from 'react'`
- Add `const inputRef = useRef<HTMLInputElement>(null)` inside the component
- Attach `ref={inputRef}` to the `<input>` element
- At the end of `handleSubmit`, after `setValue('')` and `setError(null)`, add:
  ```ts
  // Restore focus so mobile keyboard stays active for the next guess
  requestAnimationFrame(() => { inputRef.current?.focus() })
  ```
  Using `requestAnimationFrame` ensures focus is set after React re-renders (important on mobile where the DOM update must complete before `.focus()` works reliably)

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. Nav dropdown: open ☰ then close ✕ — no bottom border line visible when closed
4. Header shows current page name at all times (e.g. "Play" when on `/play`)
5. Puzzle screen: two accordion panels, both expanded by default; tapping header collapses/expands with animation; header always shows setter name + solved/count status
6. After submitting a guess, the input is automatically focused again and the keyboard remains open on mobile
7. No `(N)` score text appears on any guess row
8. Mini squares are stacked in 3 rows (green / yellow / grey); correct guesses show only a green row of 5
9. Header sticks to the top of the viewport when scrolling on puzzle/leaderboard/history screens
10. No `text-indigo-*` classes remain anywhere in the app

## Decisions & Scope

- **Accordion default state**: Both panels open on load (`expanded: true`). Players who have already solved a puzzle can collapse it to focus on the unsolved one.
- **`max-h-[2000px]` for accordion body**: Using a large arbitrary max-height is the simplest CSS approach for variable-height content. An alternative is JS-measured height, but that adds complexity not warranted here.
- **GuessInput colours**: Updated to gray-900 scheme in this release as part of the broader indigo cleanup. This does NOT change behaviour — purely visual.
- **WordSetForm colours**: Updated to gray-900 scheme for consistency with GuessInput.
- **OthersPanel separator**: The `border-t` wrapper is removed since the accordion body already provides visual separation from the guess list via `mt-4` on the input area.
- **TodayTab indigo text**: Treated as colour sweep under change 8 — replaced with `text-gray-900` or `font-semibold text-gray-700` as appropriate in context.
