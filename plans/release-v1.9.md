# Release v1.9 — Hold-to-Grey, Saved Working, Scores Sorting, and Bug Fixes

## Overview

| Field | Value |
|---|---|
| Release | v1.9 |
| Branch | release/v1.9 |
| Date | 2026-04-06 |
| Status | Done |

### Summary
Fifteen changes across puzzle annotation, data persistence, scores sorting, navigation, and bug fixes. Two new interactive features (hold-to-grey and saved tile working state), improvements to tile cycling UX (disable when solved, toggle-off grey), sorting and navigation improvements to the scores and home pages, all-time tab additions (leaders section, readable notes), fixes for past puzzles showing today plus question mark behaviour, plus column width and all-time tab refactors. Also bumps the app version to 1.9.0.

### Changes included
- New: hold-down a guess tile to set all instances of that letter to grey across all rows; hold again to toggle back to default
- New: save tile colour "working" + guess count to S3 at solve time; restore on next visit
- Fix: Daily scores table sorted by best score (lowest guesses) first
- New: two "Today" / "All Time" CTA buttons on home screen; each opens the leaderboard on the matching tab
- Fix: Past puzzles bug — question marks appear because phantom dates (only `results.json`, no guesses) appear in the listing; fix key filter to require guesses files
- Fix: Past puzzles now includes today's date (even if incomplete); uncompleted puzzles show `?` tiles
- Fix: Past puzzles player column too narrow — "Mum" wraps to two lines
- Fix: All-time tab shows 0 completed days because today's active date is excluded; fix to include today
- Refactor: All-time tab — merge two tables into one with "Guesses" + "Points" columns; add explanatory note on separate lines; remove section titles; remove column title colours
- New: All-time tab — leaders section above table showing player with fewest guesses and player with most points
- Fix: Disable tile colour cycling (and hide Reset button) once a puzzle is solved
- Chore: bump `app/package.json` version to `1.9.0`

---

## Bug Root Cause Analysis

### Bug #5 — Past Puzzles Question Marks

**Root cause:** `WordHistory.tsx` uses any key matching `data/days/{date}/` to build the date list. April 5 only has `data/days/2026-04-05/results.json` (auto-created by `useResultsFinalisation` when the day reset). No words or guesses files exist for April 5, so all values come back null → `allFinished = false` → `?` tiles shown.

**Fix:** Change the regex in `WordHistory.tsx` to only match keys containing `guesses-` (e.g. `data/days/{date}/guesses-`) so only dates with actual player guesses appear in the history.

### Bug #7 — All-Time Tab Shows 0 Completed Days

**Root cause:** `extractPastDates` in `AllTimeTab.tsx` uses `d < activePuzzleDate` (strict less than). Today (April 6) IS the active puzzle date. All game data lives on April 6. Only April 5 is treated as "past" but April 5 has no guesses → `isCompletedDay` returns false → `completedDayCount = 0`.

**Fix:** Change to `d <= activePuzzleDate` in the AllTimeTab version of `extractPastDates`. The `isCompletedDay` check already handles incomplete days correctly — if today's puzzles are not all solved, the day won't be counted. This change is safe.

---

## Implementation Plan

### Phase 1 — Change #5: Fix WordHistory key filter (1 file, 1 line change)

> **Resolved (Build Agent):** Plan confirmed against source. Regex change is on line ~32 of WordHistory.tsx. No issues.

**File:** `app/src/components/WordHistory/WordHistory.tsx`

In the `useEffect`, line ~30, change the regex from:
```typescript
const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\//)
```
to:
```typescript
const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\/guesses-/)
```
This ensures only dates that have actual player guesses files appear.

---

### Phase 2 — Change #7: Fix AllTimeTab past dates to include today (1 file, 1 line change)

**File:** `app/src/components/Leaderboard/AllTimeTab.tsx`

In `extractPastDates`, change:
```typescript
if (d < activePuzzleDate) dateSet.add(d)
```
to:
```typescript
if (d <= activePuzzleDate) dateSet.add(d)
```

---

### Phase 3 — Change #3: Sort Daily Scores table (1 file)

**File:** `app/src/components/Leaderboard/TodayTab.tsx`

After building `dailyTotals`, sort before rendering:
- Completed players (`solved === 2`) first, sorted by `total` ascending
- Incomplete players after (sorted by `total` ascending / CONFIG.players order)

Replace the `{dailyTotals.map(...)` in the Daily Scores tbody with `{[...dailyTotals].sort((a, b) => { ... }).map(...)`.

Sort logic:
```typescript
[...dailyTotals].sort((a, b) => {
  const aComplete = a.solved === (CONFIG.players.length - 1)
  const bComplete = b.solved === (CONFIG.players.length - 1)
  if (aComplete && !bComplete) return -1
  if (!aComplete && bComplete) return 1
  return a.total - b.total
})
```
Note: `CONFIG.players.length - 1 = 2` represents all non-self puzzles solved. This keeps it generic without hardcoding 2.

---

### Phase 4 — Change #6: Fix past puzzles player column width (1 file)

**File:** `app/src/components/WordHistory/DayEntry.tsx`

Change both `className="w-28 ..."` occurrences on the `<td>` player name cells (row 1 setter, rows 2+ guessers) to `w-36`. There are exactly two: the setter name `<td>` and the guesser name `<td>`.

---

### Phase 5 — Change #4: Add "View Scores" CTA to Home screen (1 file)

**File:** `app/src/components/Lobby/Lobby.tsx`

After the Practice Puzzle CTA section and before the version number `<p>`, add a new section:
```tsx
{/* CTA 4 — View Scores */}
{!loading && (
  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
    <div>
      <h2 className="text-base font-bold text-gray-900">View Scores</h2>
      <p className="mt-1 text-xs text-gray-500">Today&apos;s leaderboard &amp; all-time stats</p>
    </div>
    <button
      onClick={() => navigate('/leaderboard')}
      className="w-full rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800"
    >
      View Leaderboard
    </button>
  </section>
)}
```

---

### Phase 6 — Change #8: Refactor All-Time Tab (1 file)

**File:** `app/src/components/Leaderboard/AllTimeTab.tsx`

Remove the "Total Scores" `<div>` section entirely (the first card with the "Total Scores" `h2`, the existing scores table, and `"Lowest score wins."` note).

Refactor the remaining "Per-player stats" card into the main scores table:
- Remove the `h2` "Total Scores" (already absent from this card)
- Change column headers: "Player" | "Guesses" (orange) | "Points" (green)
- Remove the subtitle row with "(lower is better)" / "(higher is better)"
- "Guesses" column = `stats.guesserScore[player.id]` (same as current "Guesses to Solve")
- "Points" column = `stats.wordSetterScore[player.id]` (same as current "Guesses from Others")
- Add trophy (🏆) in the Guesses column for the overall winner (use `stats.overallWinnerIds`)
- Highlight winner row with `bg-amber-50` (same as before)
- Sort players by `guesserScore` ascending (use existing `sortedPlayers` variable)
- Add an explanatory note below the table:
  ```
  Guesses: total guesses you made to solve other players' words (lower is better).
  Points: total guesses others made on your words — your words were harder to crack (higher is better).
  ```

Final structure of the component after the hero stat:
```tsx
<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
        <th className="pb-1 font-medium">Player</th>
        <th className="pb-1 text-center font-medium text-orange-500">Guesses</th>
        <th className="pb-1 text-center font-medium text-green-600">Points</th>
      </tr>
    </thead>
    <tbody>
      {sortedPlayers.map((player) => {
        const isWinner = stats.overallWinnerIds.includes(player.id)
        return (
          <tr key={player.id} className={`border-b border-gray-100 ${isWinner && stats.completedDayCount > 0 ? 'bg-amber-50' : ''}`}>
            <td className="py-2 font-medium text-gray-900">{getPlayerDisplay(player.id)}</td>
            <td className="py-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-base font-bold text-gray-900">{stats.guesserScore[player.id]}</span>
                {isWinner && stats.completedDayCount > 0 && <span>🏆</span>}
              </div>
            </td>
            <td className="py-2 text-center font-bold text-gray-900">{stats.wordSetterScore[player.id]}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
  <p className="mt-3 text-xs text-gray-500">
    <strong>Guesses:</strong> total guesses you made to solve everyone else&apos;s words (lower is better).{' '}
    <strong>Points:</strong> total guesses others made on your words — your words were harder to crack (higher is better).
  </p>
</div>
```

---

### Phase 7 — Change #1: Hold-to-Grey (2 files)

#### 7a. `app/src/components/Puzzles/GuessRow.tsx`

Add a `onSetAllLetterToGrey?: (letter: string) => void` prop.

Replace the `onClick` on each tile `<div>` with pointer event handlers (long-press detection). Remove `onClick` entirely on non-correct tiles; use `onPointerDown` / `onPointerUp` / `onPointerLeave` / `onPointerCancel` instead:

- `onPointerDown`: start a 500ms timer → on completion, call `onSetAllLetterToGrey(letter)` and set a `longPressedRef = true` flag
- `onPointerUp`: if timer still running (no long press), clear timer and call `cycleColor(i)` (short press = colour cycle)
- `onPointerLeave` / `onPointerCancel`: cancel timer, clear flag

Use `useRef` for the timer and the `longPressFired` flag. Prevent default on `onContextMenu` to suppress OS browser context menu on long press.

Add `select-none` to the tile className to prevent text selection during long press.

Keep `isCorrect` tiles unclickable (same as today — no pointer handlers when `isCorrect`).

```tsx
// New refs at top of GuessRow
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const longPressedRef = useRef(false)

function startLongPress(letter: string) {
  longPressedRef.current = false
  timerRef.current = setTimeout(() => {
    longPressedRef.current = true
    onSetAllLetterToGrey?.(letter)
    timerRef.current = null
  }, 500)
}

function cancelLongPress() {
  if (timerRef.current) {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

function handlePointerUp(i: number) {
  if (timerRef.current) {
    cancelLongPress()
    if (!longPressedRef.current) {
      cycleColor(i)
    }
  }
  longPressedRef.current = false
}
```

Replace tile's `onClick={isCorrect ? undefined : () => cycleColor(i)}` with:
```tsx
onPointerDown={!isCorrect ? () => startLongPress(letter) : undefined}
onPointerUp={!isCorrect ? () => handlePointerUp(i) : undefined}
onPointerLeave={!isCorrect ? cancelLongPress : undefined}
onPointerCancel={!isCorrect ? cancelLongPress : undefined}
onContextMenu={(e) => e.preventDefault()}
```
Add `select-none` to tile `className`.

#### 7b. `app/src/components/Puzzles/GuessList.tsx`

Add `handleSetAllLetterToGrey(letter: string)` function:
```typescript
function handleSetAllLetterToGrey(letter: string) {
  setOverrides((prev) =>
    prev.map((row, rowIndex) =>
      row.map((override, tileIndex) => {
        const tileLetter = guesses[rowIndex]?.word[tileIndex]?.toUpperCase()
        return tileLetter === letter.toUpperCase() ? 'grey' : override
      })
    )
  )
}
```

Pass `onSetAllLetterToGrey={handleSetAllLetterToGrey}` to each `<GuessRow>`.

---

### Phase 8 — Change #2: Save tile working state at solve time (3 files)

#### 8a. `app/src/types/index.ts`

Add two new interfaces:
```typescript
export interface SavedWorkingEntry {
  puzzle_setter_id: string
  guesses_to_solve: number
  tile_overrides: (TileOverride | null)[][]
  saved_at: string
}

export interface SavedWorking {
  date: string
  guesser_id: string
  entries: SavedWorkingEntry[]
}
```

Note: `TileOverride` is already defined in `tileOverride.ts` as `'green' | 'orange' | 'grey' | null`. Import it from there in the types file:
```typescript
import type { TileOverride } from '../components/Puzzles/tileOverride'
```
OR inline the type in `SavedWorkingEntry` to avoid cross-layer imports:
```typescript
tile_overrides: ('green' | 'orange' | 'grey' | null)[][]
```
**Use the inline form to avoid importing from a component folder into types.**

#### 8b. `app/src/components/Puzzles/GuessList.tsx`

1. Add two new optional props to `GuessListProps`:
   ```typescript
   initialOverrides?: (TileOverride | null)[][]
   onSolveSnapshot?: (overrides: (TileOverride | null)[][], guessCount: number) => void
   ```

2. Change the `useState` initializer to use `initialOverrides` when provided:
   ```typescript
   const [overrides, setOverrides] = useState<(TileOverride | null)[][]>(() =>
     initialOverrides && initialOverrides.length === guesses.length
       ? initialOverrides
       : guesses.map((g) => Array(g.word.length).fill(null))
   )
   ```

3. Add solve-snapshot detection using a ref to fire only once:
   ```typescript
   const wasSolvedRef = useRef(false)
   const isSolved = guesses.some((g) => g.is_correct)

   useEffect(() => {
     if (isSolved && !wasSolvedRef.current) {
       wasSolvedRef.current = true
       onSolveSnapshot?.(overrides, guesses.length)
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isSolved])
   ```
   The effect intentionally omits `overrides` and `guesses.length` from deps — it fires once on the first time `isSolved` becomes true, capturing the correct values at that exact render.

#### 8c. `app/src/components/Puzzles/PuzzlePanel.tsx`

1. Import `SavedWorking` and `SavedWorkingEntry` from types.

2. Add a new state:
   ```typescript
   const [savedOverrides, setSavedOverrides] = useState<(TileOverride | null)[][] | null>(null)
   ```

3. In the existing `loadAll()` `useEffect`, add a parallel fetch for the saved working file:
   ```typescript
   const [targetFile, myGuessFile, savedWorkingFile] = await Promise.all([
     readJson<PuzzleWord>(`data/words/${date}/${setterId}.json`),
     readJson<PlayerGuesses>(`data/days/${date}/guesses-${currentPlayerId}.json`),
     readJson<SavedWorking>(`data/days/${date}/saved-working-${currentPlayerId}.json`),
   ])
   ```
   Then extract and set:
   ```typescript
   const savedEntry = savedWorkingFile?.entries.find(
     (e) => e.puzzle_setter_id === setterId
   )
   if (savedEntry) {
     setSavedOverrides(savedEntry.tile_overrides as (TileOverride | null)[][])
   }
   ```

4. Add `handleSolveSnapshot` function:
   ```typescript
   async function handleSolveSnapshot(
     overrides: (TileOverride | null)[][],
     guessCount: number,
   ) {
     const workingKey = `data/days/${date}/saved-working-${currentPlayerId}.json`
     const existingFile = await readJson<SavedWorking>(workingKey)
     // Idempotency: if already saved for this puzzle, do nothing
     if (existingFile?.entries.some((e) => e.puzzle_setter_id === setterId)) return

     const newEntry: SavedWorkingEntry = {
       puzzle_setter_id: setterId,
       guesses_to_solve: guessCount,
       tile_overrides: overrides,
       saved_at: new Date().toISOString(),
     }
     const updatedFile: SavedWorking = {
       date,
       guesser_id: currentPlayerId,
       entries: [...(existingFile?.entries ?? []), newEntry],
     }
     await writeToS3(workingKey, updatedFile)
   }
   ```

5. Pass new props to `GuessList`:
   ```tsx
   <GuessList
     guesses={myGuesses}
     initialOverrides={savedOverrides ?? undefined}
     onSolveSnapshot={handleSolveSnapshot}
   />
   ```

---

### Phase 9 — Hold-to-grey toggle: make it reversible (1 file)

**File:** `app/src/components/Puzzles/GuessList.tsx`

The existing `handleSetAllLetterToGrey` always sets all instances of a letter to grey. Change it to toggle: if every instance of that letter across all non-final rows is **already** grey, reset them all to `null`; otherwise set them all to `'grey'`.

```typescript
function handleSetAllLetterToGrey(letter: string) {
  const upperLetter = letter.toUpperCase()

  // Collect (rowIndex, tileIndex) pairs for all tiles matching this letter
  const positions: { row: number; col: number }[] = []
  guesses.forEach((g, rowIndex) => {
    g.word.split('').forEach((_, tileIndex) => {
      if (guesses[rowIndex]?.word[tileIndex]?.toUpperCase() === upperLetter) {
        positions.push({ row: rowIndex, col: tileIndex })
      }
    })
  })

  // Check if ALL matching tiles are currently grey
  const allGrey = positions.every(({ row, col }) => overrides[row]?.[col] === 'grey')

  setOverrides((prev) =>
    prev.map((row, rowIndex) =>
      row.map((override, tileIndex) => {
        if (guesses[rowIndex]?.word[tileIndex]?.toUpperCase() === upperLetter) {
          return allGrey ? null : 'grey'
        }
        return override
      })
    )
  )
}
```

Note: `overrides` is in scope from the component's state, so `allGrey` can read it directly (not inside `setOverrides` callback). This is safe because `overrides` is read synchronously before the state update is scheduled.

---

### Phase 10 — Disable tile color cycling when puzzle is solved (2 files)

#### 10a. `app/src/components/Puzzles/GuessRow.tsx`

Add a `disabled?: boolean` prop to `GuessRowProps`. When `disabled` is true, no pointer handlers are attached to any tile (overrides the existing `!isCorrect` check) and `cursor-pointer` is also suppressed.

Change all checks from `!isCorrect` to `!isCorrect && !disabled`:

```typescript
interface GuessRowProps {
  // ... existing props ...
  disabled?: boolean
}
```

In the tile render, replace every `!isCorrect` guard with `!isCorrect && !disabled`:
```tsx
onPointerDown={!isCorrect && !disabled ? () => startLongPress(letter) : undefined}
onPointerUp={!isCorrect && !disabled ? () => handlePointerUp(i) : undefined}
onPointerLeave={!isCorrect && !disabled ? cancelLongPress : undefined}
onPointerCancel={!isCorrect && !disabled ? cancelLongPress : undefined}
```
And in the `className`:
```tsx
className={`${tileBase} ${tileColorClass}${!isCorrect && !disabled ? ' cursor-pointer' : ''}`}
```

#### 10b. `app/src/components/Puzzles/GuessList.tsx`

`isSolved` is already computed: `const isSolved = guesses.some((g) => g.is_correct)`.

1. Pass `disabled={isSolved}` to every `<GuessRow>`.
2. Conditionally hide the Reset Tiles / Tap tiles button when `isSolved`. Change the condition from `{guesses.length > 0 && (...)` to `{guesses.length > 0 && !isSolved && (...)`.

```tsx
{guesses.length > 0 && !isSolved && (
  <button ...>...</button>
)}
```

---

### Phase 11 — All-time tab: separate explanation lines + remove column title colours (1 file)

**File:** `app/src/components/Leaderboard/AllTimeTab.tsx`

Two changes in the merged table card:

1. **Column headers**: Remove the orange/green colour classes from "Guesses" and "Points" headers — change both to plain `text-gray-500`.

   ```tsx
   <th className="pb-1 text-center font-medium text-gray-500">Guesses</th>
   <th className="pb-1 text-center font-medium text-gray-500">Points</th>
   ```

2. **Explanatory note**: Split the single `<p>` into two separate `<p>` tags:

   ```tsx
   <p className="mt-3 text-xs text-gray-500">
     <strong>Guesses:</strong> total guesses you made to solve everyone else&apos;s words (lower is better).
   </p>
   <p className="mt-1 text-xs text-gray-500">
     <strong>Points:</strong> total guesses others made on your words — your words were harder to crack (higher is better).
   </p>
   ```

---

### Phase 12 — All-time tab: leaders section above table (1 file)

**File:** `app/src/components/Leaderboard/AllTimeTab.tsx`

Add a 2-column leaders grid **above** the merged Guesses/Points table, only shown when `stats.completedDayCount > 0`.

Compute the two leaders from existing `stats`:
```typescript
// Least guesses — use sortedPlayers[0] (already sorted ascending by guesserScore)
const leastGuessesPlayer = sortedPlayers[0]

// Most points — find player with max wordSetterScore
const maxPoints = Math.max(...CONFIG.players.map((p) => stats.wordSetterScore[p.id]))
const mostPointsPlayer = CONFIG.players.find((p) => stats.wordSetterScore[p.id] === maxPoints) ?? CONFIG.players[0]
```

If there are 0 completed days (`stats.completedDayCount === 0`), skip this section entirely.

Insert before the `{/* Merged Guesses + Points table */}` `<div>`:

```tsx
{/* Leaders section */}
{stats.completedDayCount > 0 && (
  <div className="grid grid-cols-2 gap-4">
    {/* Left: fewest guesses */}
    <div className="flex flex-col items-center text-center">
      <span className="text-5xl leading-none">
        {playerEmojis[leastGuessesPlayer.id] ?? leastGuessesPlayer.defaultEmoji}
      </span>
      <p className="mt-2 text-xs font-semibold text-gray-700">{leastGuessesPlayer.name}</p>
      <p className="text-xs text-gray-500">Fewest Guesses</p>
    </div>
    {/* Right: most points */}
    <div className="flex flex-col items-center text-center">
      <span className="text-5xl leading-none">
        {playerEmojis[mostPointsPlayer.id] ?? mostPointsPlayer.defaultEmoji}
      </span>
      <p className="mt-2 text-xs font-semibold text-gray-700">{mostPointsPlayer.name}</p>
      <p className="text-xs text-gray-500">Most Points</p>
    </div>
  </div>
)}
```

Note: `leastGuessesPlayer` and `mostPointsPlayer` are `CONFIG.players` entries (which have `.defaultEmoji`), not calls to `getPlayerDisplay`. The emoji is read from `playerEmojis` (context) with fallback to `defaultEmoji`, consistent with how other components handle it.

---

### Phase 13 — Past puzzles: include today's date (1 file)

**File:** `app/src/components/WordHistory/WordHistory.tsx`

Two changes in the `load()` `useEffect`:

1. Change the date filter from `match[1] < activePuzzleDate` to `match[1] <= activePuzzleDate` so today appears when S3 keys exist for it.

2. After the key-scanning loop, unconditionally add today's date so it always appears even if no guesses have been submitted yet:
   ```typescript
   dateSet.add(activePuzzleDate)
   ```

3. Reverse the sort so the most recent day (today) appears first.
   The current sort is `.sort().reverse()` — no change needed here, today will naturally be first.

4. Update the empty-state message:
   ```tsx
   {!loading && pastDates.length === 0 && (
     <p className="text-sm text-gray-500">No puzzle days yet.</p>
   )}
   ```

The existing `DayData` loading already handles partial/missing data — `allFinished: false` → `?` tiles shown in DayEntry. No changes needed in the data-loading logic.

---

### Phase 14 — Replace "View Leaderboard" with "Today" / "All Time" buttons (2 files)

#### 14a. `app/src/components/Lobby/Lobby.tsx`

Replace the existing CTA 4 "View Scores" section (single "View Leaderboard" button) with a new section containing two side-by-side buttons:

```tsx
{/* CTA 4 — View Scores */}
{!loading && (
  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
    <div>
      <h2 className="text-base font-bold text-gray-900">View Scores</h2>
      <p className="mt-1 text-xs text-gray-500">Today&apos;s leaderboard &amp; all-time stats</p>
    </div>
    <div className="flex gap-3">
      <button
        onClick={() => navigate('/leaderboard', { state: { tab: 'today' } })}
        className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
      >
        Today
      </button>
      <button
        onClick={() => navigate('/leaderboard', { state: { tab: 'alltime' } })}
        className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
      >
        All Time
      </button>
    </div>
  </section>
)}
```

#### 14b. `app/src/components/Leaderboard/Leaderboard.tsx`

Import `useLocation` from `react-router-dom`. Read navigation state to set the initial tab:

```typescript
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../shared/Header'
import TodayTab from './TodayTab'
import AllTimeTab from './AllTimeTab'

type Tab = 'today' | 'alltime'

export default function Leaderboard() {
  const location = useLocation()
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'today'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  // ... rest of component unchanged
```

The rest of the component (tab bar, tab content) remains unchanged.

---

### Phase 15 — Bump app/package.json version to 1.9.0 (1 file)

**File:** `app/package.json`

Change `"version": "1.7.0"` to `"version": "1.9.0"`.

This is the value injected by Vite as `__APP_VERSION__` and displayed on the home screen via `v{__APP_VERSION__}`.

---

---

### Phase 16 — Change #16: Hold-to-colour (replaces hold-to-grey toggle) (2 files)

**Replaces the hold-to-grey toggle logic from Phases 7 and 9.**

When the user holds a tile for 500ms, all instances of that letter across all rows are set to the **current colour of the held tile** (its `overrides[i]` value, which may be `null` for default). The held tile itself does not visually change because it is already that colour. There is no toggle; each hold is a direct assignment.

#### 16a. `app/src/components/Puzzles/GuessRow.tsx`

- Rename prop `onSetAllLetterToGrey` to `onSetAllLetterToColor`, change signature to `(letter: string, color: TileOverride | null) => void`
- Change `startLongPress(letter: string)` to `startLongPress(letter: string, tileIndex: number)` — captures `overrides[tileIndex]` at press time
- On timer fire, call `onSetAllLetterToColor?.(letter, overrides[tileIndex])`
- Update JSX `onPointerDown` to `() => startLongPress(letter, i)`

#### 16b. `app/src/components/Puzzles/GuessList.tsx`

- Rename `handleSetAllLetterToGrey` to `handleSetAllLetterToColor`, change signature to `(letter: string, color: TileOverride | null)`
- Remove all toggle/positions logic; simply set every matching tile to `color`
- Update GuessRow prop from `onSetAllLetterToGrey` to `onSetAllLetterToColor`

---

### Phase 17 — Change #17: Today tab — large emoji leaders section (1 file)

**File:** `app/src/components/Leaderboard/TodayTab.tsx`

Replace the existing amber winner banner (the ternary that shows either a trophy text row or "Not all players completed") with:
- When `allPlayersCompleted`: a 2-column leaders grid matching the AllTimeTab style (large emoji, player name, label)
- Otherwise: keep the "Not all players have completed today's puzzles" message

Compute leaders from already-available data:
- **Fewest guesses**: `finalisedWinnerIds[0]` → look up CONFIG.players entry
- **Most points** (most guesses made on your word): compute `pointsPerSetter` by summing `puzzle.guessCounts` values for each setter in `puzzleStats`; find CONFIG.players entry with max

```tsx
// Compute most-points setter from puzzleStats (guesses made on each player's word)
const pointsPerSetter: Record<string, number> = {}
for (const puzzle of puzzleStats) {
  pointsPerSetter[puzzle.setterId] = Object.values(puzzle.guessCounts)
    .filter((c): c is number => c !== null)
    .reduce((sum, c) => sum + c, 0)
}
const maxPoints = Math.max(...CONFIG.players.map((p) => pointsPerSetter[p.id] ?? 0))
const mostPointsEntry = CONFIG.players.find((p) => (pointsPerSetter[p.id] ?? 0) === maxPoints) ?? CONFIG.players[0]
const fewestGuessesEntry = CONFIG.players.find((p) => p.id === finalisedWinnerIds[0]) ?? CONFIG.players[0]
```

Replace the banner with:
```tsx
{allPlayersCompleted && finalisedWinnerIds.length > 0 ? (
  <div className="grid grid-cols-2 gap-4">
    <div className="flex flex-col items-center text-center">
      <span className="text-5xl leading-none">
        {playerEmojis[fewestGuessesEntry.id] ?? fewestGuessesEntry.defaultEmoji}
      </span>
      <p className="mt-2 text-xs font-semibold text-gray-700">{fewestGuessesEntry.name}</p>
      <p className="text-xs text-gray-500">fewest guesses</p>
    </div>
    <div className="flex flex-col items-center text-center">
      <span className="text-5xl leading-none">
        {playerEmojis[mostPointsEntry.id] ?? mostPointsEntry.defaultEmoji}
      </span>
      <p className="mt-2 text-xs font-semibold text-gray-700">{mostPointsEntry.name}</p>
      <p className="text-xs text-gray-500">most points</p>
    </div>
  </div>
) : (
  <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
    Not all players have completed today&apos;s puzzles
  </p>
)}
```

---

### Phase 18 — Change #18: All-time tab — trophy in Points column (1 file)

**File:** `app/src/components/Leaderboard/AllTimeTab.tsx`

Add a trophy (🏆) in the Points column for the player with the highest `wordSetterScore` (already tracked in `mostPointsPlayer`).

Change the Points `<td>` from a simple bold span to a flex container (matching Guesses column style):
```tsx
<td className="py-2 text-center">
  <div className="flex items-center justify-center gap-2">
    <span className="text-base font-bold text-gray-900">{stats.wordSetterScore[player.id]}</span>
    {player.id === mostPointsPlayer.id && stats.completedDayCount > 0 && <span>🏆</span>}
  </div>
</td>
```

The table is already sorted by `guesserScore` ascending via `sortedPlayers` — no change needed.

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero warnings or errors
3. Manual checks at http://localhost:5173:
   - **Hold-to-colour**: Hold down a default-colour tile → all instances of that letter become default. Hold down an orange tile → all instances become orange.
   - **Hold-to-colour vs click**: Short tap still cycles colour normally; long press does NOT cycle
   - **Tile cycling disabled when solved**: After solving a puzzle, all tiles are locked. Reset button is hidden.
   - **Save working**: Solve a puzzle, return to it — saved tile colours are restored.
   - **Daily scores sort**: Scores tab "Daily Scores" table shows lowest total at top
   - **Today tab leaders**: When all players complete, shows large emoji grid with fewest-guesses and most-points players
   - **Past puzzles shows today**: Past Puzzles page shows today's date as the first entry; uncompleted puzzles show `?` tiles
   - **Past puzzles fix**: No phantom dates with `?` for days with no guesses
   - **Past puzzles columns**: Player emoji + name display on single lines (including "🌸 Mum")
   - **All-time completed days**: All-time tab shows correct `completedDayCount` (including today if all puzzles solved)
   - **All-time leaders**: Grid above the table shows correct fewest-guesses and most-points players; hidden when no completed days
   - **All-time table**: Trophy in both Guesses column (fewest guesses winner) and Points column (most points winner); table sorted fewest guesses first
   - **View Scores CTA**: Home screen shows "Today" and "All Time" buttons side by side; each navigates to `/leaderboard` and opens the correct tab
   - **Version**: Home screen shows `v1.9.0`

## Decisions & Scope

- **Hold-to-grey timing**: 500ms long-press threshold. No visual feedback animation on the hold (keep it simple; the grey switch itself is the feedback).
- **Hold-to-grey toggle logic**: "All grey" check is computed outside `setOverrides` using current `overrides` state snapshot. This is safe because the read and the state update are in the same synchronous call.
- **Tile cycling disabled**: Implemented via a `disabled` prop on `GuessRow` rather than conditional handlers in `GuessList`, making the intent explicit. The correct (winning) row was already unclickable via `isCorrect`; `disabled` extends this to all rows once solved.
- **Save working — tile_overrides shape**: Stores the full 2D array `(TileOverride | null)[][]` — one row per guess. If a puzzle has no manual overrides at solve time, all values are `null`. Stored inline as `'green' | 'orange' | 'grey' | null` to avoid cross-layer type imports.
- **Save working — idempotency**: The server-side check in `handleSolveSnapshot` re-reads the file before writing and skips if the entry already exists. This handles edge cases like double-submit.
- **Save working — practice mode**: `PracticeView` uses `GuessList` but does not pass `onSolveSnapshot` or `initialOverrides`. Practice solves are never saved. No changes needed in `PracticeView`.
- **AllTimeTab `<=` change**: `totalPastDays` in the `stats` object will now sometimes include today. It is not rendered in the UI (no visible `totalPastDays` display), so this has no user-visible side effect.
- **Past puzzles today**: `activePuzzleDate` is always added unconditionally after the key scan, guaranteeing today always appears even if no guesses have been submitted yet. The DayEntry component already handles all-null data gracefully.
- **Leaders section ties**: If two players are tied on fewest guesses, `sortedPlayers[0]` is used (first alphabetically by CONFIG order). Same for most points. Ties are uncommon with 3 players and the simple "first" behaviour is acceptable.
- **Navigation state for tab**: `useLocation().state` carries `{ tab: 'today' | 'alltime' }`. If the user navigates directly to `/leaderboard` without state, it defaults to `'today'`. Back-navigation does not re-read state (React Router clears it on re-navigation), which is fine.
- **Out of scope**: No leaderboard route changes beyond tab deep-linking, no new S3 infrastructure, no auth changes.
