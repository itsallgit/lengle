# Release v1.12 — UX polish, past puzzle detail view, and play-guard

## Overview

| Field | Value |
|---|---|
| Release | v1.12 |
| Branch | release/v1.12 |
| Date | 2026-04-10 |
| Status | Done |

### Summary
This release addresses five separate improvements: fixing the release manager to delete git branches after closing a release; preventing the native mobile keyboard from appearing after a guess via the on-screen keyboard; improving the "All completed" indicator in Past Puzzles to use a pill badge; adding a "View Guesses" button that opens a new read-only past puzzle detail page; and blocking players from reaching today's puzzles until they have set their words for both today and tomorrow.

### Changes included
- Release agent Routine C updated to delete local and remote release branches after squash merge
- On-screen keyboard no longer triggers native mobile keyboard focus after submitting a guess
- "All completed" indicator on Past Puzzles list replaced with a green pill badge
- "View Guesses" button added to each guesser row in Past Puzzles — opens new read-only past puzzle detail page
- Players are blocked from playing today's puzzles until they have set words for today and tomorrow, with inline word-setting forms and messaging on both Lobby and Play pages

---

## Implementation Plan

### Phase 1 — Release Agent branch cleanup
**File: `.github/agents/release-agent.agent.md`**

After step **C8** (squash merge into main), insert two new steps before C9:

**C8a — Delete local release branch**
```bash
git branch -d release/{version}
```

**C8b — Delete remote release branch**
```bash
git push origin --delete release/{version}
```

Update **C10 — Report** to include:
> The local and remote `release/{version}` branches have been deleted.

Note: Change the existing C10 line that says "The release branch `release/{version}` is preserved for reference" to remove that sentence (branches are now deleted, not preserved).

> **Resolved (Build Agent):** Inserting C8a and C8b steps directly after C8 in the agent file, and updating C10 to report branch deletion instead of preservation.

---

### Phase 2 — On-screen keyboard focus fix
**Files: `app/src/components/Puzzles/PuzzlePanel.tsx`, `app/src/components/Puzzles/GuessInput.tsx`**

**The problem:** In `GuessInput.handleSubmit`, after submitting a guess, `inputRef.current?.focus()` is called unconditionally. On mobile, this opens the native keyboard. This is fine when the user typed via the native keyboard, but unwanted when they used the on-screen keyboard.

**Step 1 — PuzzlePanel.tsx:**
- Add a ref: `const lastInputSourceRef = useRef<'native' | 'onscreen'>('native')`
- Wrap the existing `setInputValue` that's passed to GuessInput in a new handler named `handleNativeInput` that sets `lastInputSourceRef.current = 'native'` before calling `setInputValue`
- Add letter-press and backspace handlers (currently inline lambdas) as named functions `handleOSKLetter` and `handleOSKBackspace` that each set `lastInputSourceRef.current = 'onscreen'` before updating input value
- Pass `shouldFocusAfterSubmit={lastInputSourceRef.current === 'native'}` as a new prop to `<GuessInput>`
- Pass `onValueChange={handleNativeInput}` (instead of `setInputValue`) to `<GuessInput>`
- Pass `onLetterPress={handleOSKLetter}` and `onBackspace={handleOSKBackspace}` to `<OnScreenKeyboard>`

**Step 2 — GuessInput.tsx:**
- Add `shouldFocusAfterSubmit: boolean` to `GuessInputProps` (default `true` if not present — note: make it required with a default of `true` to be explicit)
- In `handleSubmit`, change the final `inputRef.current?.focus()` call to be conditional:
  ```ts
  // Only re-focus if the user is using the native keyboard; OSK users should not
  // trigger the native mobile keyboard by refocusing after each guess.
  if (shouldFocusAfterSubmit) {
    inputRef.current?.focus()
  }
  ```
- The `useEffect` that focuses on `disabled → enabled` transition must remain unchanged (it should always focus on first enable, regardless of input source).

---

### Phase 3 — "All completed" pill badge (trivial)
**File: `app/src/components/WordHistory/DayEntry.tsx`**

Replace the existing plain text completion indicator:
```jsx
<span className="text-xs font-medium text-green-600">✓ All completed</span>
```

With a pill badge:
```jsx
<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
  ✓ All completed
</span>
```

No other changes needed.

---

### Phase 4 — "View Guesses" button and PastPuzzleDetail page
**Files: `app/src/components/WordHistory/DayEntry.tsx`, `app/src/components/Puzzles/PastPuzzleDetail.tsx` (NEW), `app/src/App.tsx`**

Can be done in parallel with Phase 3.

#### 4a — DayEntry.tsx: Add "View Guesses" button

- Import `useNavigate` from `'react-router-dom'`
- Call `const navigate = useNavigate()` inside the component
- In the guesser rows table, add a third `<td>` column to each guesser `<tr>` with `className="py-1.5 text-right"` containing the button:
  ```jsx
  <td className="py-1.5 text-right">
    {result?.guessCount != null && (
      <button
        type="button"
        onClick={() => navigate(`/history/${date}/${player.id}/${guesser.id}`)}
        className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
      >
        View Guesses
      </button>
    )}
  </td>
  ```
- The button only renders when `result.guessCount != null` (player has guesses to show)
- The route params are: `date` (already available as prop), `player.id` (the setter — the outer loop variable), `guesser.id` (the guesser — the inner loop variable)

#### 4b — PastPuzzleDetail.tsx (NEW component)

Create `app/src/components/Puzzles/PastPuzzleDetail.tsx`.

This page is not in the navbar. The back button uses `navigate(-1)` to return to the previous page.

**Data loading:**
- Extract `date`, `setterId`, `guesserId` from `useParams()`
- Fetch in parallel via `readJson`:
  - `data/words/${date}/${setterId}.json` → `PuzzleWord | null` (the puzzle's target word)
  - `data/days/${date}/guesses-${guesserId}.json` → `PlayerGuesses | null`
  - `data/days/${date}/saved-working-${guesserId}.json` → `SavedWorking | null`
- From `PlayerGuesses.guesses`, filter to entries where `puzzle_setter_id === setterId`
- From `SavedWorking.entries`, find the entry where `puzzle_setter_id === setterId` and read `tile_overrides`
- Look up setter and guesser configs from `CONFIG.players` and `playerEmojis` context

**Layout:**
```
<Header />
<div class="min-h-screen bg-gray-50">
  <div class="mx-auto max-w-lg px-4 py-6 space-y-4">

    // Back button
    <button onClick={() => navigate(-1)} class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
      ← Back
    </button>

    // Summary card
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-1">
      <div class="text-sm text-gray-700">Puzzle set by <span class="font-semibold">{setterDisplay}</span></div>
      <div class="text-sm text-gray-700">Guesses by <span class="font-semibold">{guesserDisplay}</span></div>
      <div class="text-sm text-gray-500">{formattedDate}</div>
      <div class="text-sm text-gray-500">{guessCount} {guessCount === 1 ? 'guess' : 'guesses'}</div>
    </div>

    // Puzzle view (read-only)
    // Render GuessList with initialOverrides from saved-working, and no-op onSolveSnapshot/onOverridesChange
    // No GuessInput, no OnScreenKeyboard
    <div class="overflow-hidden sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm">
      <div class="bg-violet-700 px-4 py-4">
        <span class="text-lg font-bold text-white">{setterDisplay}'s puzzle</span>
        {isSolved && targetWord && (
          <div class="mt-1 text-sm text-violet-200">Word: {targetWord}</div>
        )}
      </div>
      <div class="bg-white px-4 py-4">
        {isLoading ? <LoadingSpinner/> : <GuessList guesses={filteredGuesses} initialOverrides={savedOverrides ?? undefined} />}
      </div>
    </div>

  </div>
</div>
```

Types needed: `PuzzleWord`, `PlayerGuesses`, `SavedWorking` all from `'../../types'`.

Note: `GuessList` does not receive `onSolveSnapshot` or `onOverridesChange` callbacks, so tile cycling works locally but nothing persists. The "Reset Tiles" button in `GuessList` is hidden automatically when `isSolved` is true.

Use the `formatDate` helper — either copy the same local function from DayEntry.tsx or extract it to a shared location (extracting to a shared location is preferred but not required; a local copy is acceptable).

#### 4c — App.tsx: Add new route

- Import `PastPuzzleDetail` from `'./components/Puzzles/PastPuzzleDetail'`
- Add the new route inside the `<Route element={<ProtectedRoute />}>` block, after the existing `/history` route:
  ```jsx
  <Route path="/history/:date/:setterId/:guesserId" element={<PastPuzzleDetail />} />
  ```
  React Router matches more-specific paths first, so this does not conflict with `/history`.

---

### Phase 5 — Block playing if words not set
**Files: `app/src/lib/date.ts`, `app/src/components/Lobby/Lobby.tsx`, `app/src/components/Puzzles/PuzzleView.tsx`**

This phase has a dependency: extract `getTomorrowPuzzleDate` to `lib/date.ts` first (step 5a), then update Lobby (step 5b) and PuzzleView (step 5c) in parallel.

#### 5a — Extract getTomorrowPuzzleDate to `app/src/lib/date.ts`

The `getTomorrowPuzzleDate()` helper currently exists as a private function in `Lobby.tsx`. Extract it to `app/src/lib/date.ts` and export it. Update `Lobby.tsx` to import it from there instead.

The function computes tomorrow's puzzle date string (`"YYYY-MM-DD"`) by taking `getActivePuzzleDate()` and adding one calendar day.

#### 5b — Lobby.tsx: Block the play button when tomorrow's word is not set

**Current behaviour**: `CTA 2` (Today's Puzzles section) only renders when `lobbyState !== 'A'`. The play button has no disabled state — it always navigates.

**New behaviour**:

1. **Always render CTA 2** (remove the `lobbyState !== 'A'` guard). The section now shows in all lobby states as a permanently visible element.

2. **Compute `canPlay`**:
   ```ts
   const canPlay = lobbyState === 'C' && tomorrowWord !== null
   ```

3. **Update the play button**:
   - `disabled={!canPlay}`
   - When disabled: `bg-gray-200 text-gray-400 cursor-not-allowed` classes instead of `bg-violet-700 text-white hover:bg-violet-800`
   - When enabled: existing violet classes

4. **Update the sub-message** under the heading (the descriptive text line), based on state:
   - `lobbyState === 'A'`: `"Set today's word above to unlock today's puzzles"`
   - `lobbyState === 'B' && !tomorrowWord`: `"Set tomorrow's word above, then wait for others to be ready"`
   - `lobbyState === 'B' && tomorrowWord !== null`: `"Waiting for {pendingPlayers}…"` (existing behaviour)
   - `lobbyState === 'C' && !tomorrowWord`: `"Set tomorrow's word above to unlock today's puzzles"`
   - `lobbyState === 'C' && tomorrowWord !== null`: `"All words are set — let's play!"` (existing)

5. **Visually emphasise the word form when needed**: In CTA 1 (set words section), when `lobbyState !== 'A' && !tomorrowWord` (i.e., the user needs to set tomorrow's word and can see the "Set Tomorrow's Word" form), add a descriptive note beneath the section heading:
   ```jsx
   <p className="mb-2 text-xs font-medium text-amber-600">⚠️ Required to unlock today's puzzles</p>
   ```
   This note only shows when `lobbyState !== 'A' && !tomorrowWord && !tomorrowWord` — i.e., the tomorrow form is currently displayed.

> **Resolved (Build Agent):** The duplicate `!tomorrowWord` in the condition is a typo. Using `lobbyState !== 'A' && !tomorrowWord` (single condition) as intended.

#### 5c — PuzzleView.tsx: Inline word-set guard

**New behaviour**: When the player navigates directly to `/play` without having set words for today and/or tomorrow, the page shows a word-setting prompt above disabled puzzle panels.

**Step 1 — Import additions**:
- Import `getTomorrowPuzzleDate` from `'../../lib/date'`
- Import `writeToS3` from `'../../lib/s3'`
- Import `WordSetForm` from `'../Lobby/WordSetForm'`
- Import `PuzzleWord`, `DayStatus` from `'../../types'`
- Import `CONFIG` (already imported)

**Step 2 — New state**:
```ts
const [date] = useState(() => getActivePuzzleDate())
const tomorrowDate = getTomorrowPuzzleDate()       // derived, no state needed
const [tomorrowWordSet, setTomorrowWordSet] = useState(false)
const [wordCheckLoading, setWordCheckLoading] = useState(true)
```

**Step 3 — Fetch tomorrow's word status** (add to the existing `useEffect` that fetches `ownWord`):
```ts
useEffect(() => {
  if (!playerId) return
  Promise.all([
    readJson<PuzzleWord>(`data/words/${date}/${playerId}.json`),
    readJson<PuzzleWord>(`data/words/${tomorrowDate}/${playerId}.json`),
  ]).then(([todayFile, tomorrowFile]) => {
    setOwnWord(todayFile?.word ?? null)
    setTomorrowWordSet(tomorrowFile !== null)
    setWordCheckLoading(false)
  })
}, [date, tomorrowDate, playerId])
```

**Step 4 — Word submission handlers** (inline submit functions, only used in the blocked state):
```ts
async function submitTodayWord(word: string): Promise<void> {
  if (!playerId) return
  const wordData: PuzzleWord = { date, setter_id: playerId, word: word.toUpperCase(), submitted_at: new Date().toISOString() }
  await writeToS3(`data/words/${date}/${playerId}.json`, wordData)
  // Also update status.json so other players see this player's word is set
  const statusKey = `data/days/${date}/status.json`
  const currentStatus = await readJson<DayStatus>(statusKey)
  const wordsSet = { ...(currentStatus?.words_set ?? {}), [playerId]: true }
  const allSet = CONFIG.players.every(p => wordsSet[p.id] === true)
  await writeToS3(statusKey, { date, words_set: wordsSet, unlocked: allSet })
  setOwnWord(word.toUpperCase())
}

async function submitTomorrowWord(word: string): Promise<void> {
  if (!playerId) return
  const wordData: PuzzleWord = { date: tomorrowDate, setter_id: playerId, word: word.toUpperCase(), submitted_at: new Date().toISOString() }
  await writeToS3(`data/words/${tomorrowDate}/${playerId}.json`, wordData)
  setTomorrowWordSet(true)
}
```

**Step 5 — Blocked state UI**:
```ts
const wordsBlocked = !wordCheckLoading && (!ownWord || !tomorrowWordSet)
```

When `wordCheckLoading` is true, show a loading screen (same as PuzzlePanel's loading skeleton).

When `wordsBlocked` is true, render ABOVE the puzzle panels:
```jsx
<div className="mx-auto max-w-lg px-4 pt-6 pb-2">
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-3">
    <div className="flex items-start gap-2">
      <span className="text-amber-500 text-lg">⚠️</span>
      <div>
        <p className="text-sm font-semibold text-amber-800">Set your words to play</p>
        <p className="text-xs text-amber-700 mt-0.5">
          {!ownWord
            ? "You need to set today's puzzle word before you can play today's puzzles."
            : "You need to set tomorrow's puzzle word before you can play today's puzzles."}
        </p>
      </div>
    </div>
    {!ownWord ? (
      <>
        <p className="text-xs font-medium text-gray-700">Today's Word</p>
        <WordSetForm
          label="Enter a 5-letter word for others to guess"
          usedWords={new Set()}
          onSubmit={submitTodayWord}
        />
      </>
    ) : (
      <>
        <p className="text-xs font-medium text-gray-700">Tomorrow's Word</p>
        <WordSetForm
          label="Enter a 5-letter word for tomorrow"
          usedWords={new Set()}
          onSubmit={submitTomorrowWord}
        />
      </>
    )}
  </div>
</div>
```

Note: `usedWords={new Set()}` is intentional — the used-words uniqueness check is skipped in this inline form. Players who use the normal Lobby flow get the full check. This edge-case path skips it for simplicity.

When `wordsBlocked` is true, add `pointer-events-none opacity-50` to the `<div>` wrapping the puzzle panels (the existing panel wrapper `div`), so panels are visually shown as disabled. No changes needed to PuzzlePanel itself.

When `wordsBlocked` is false (words are set), render normally as today.

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. **Phase 2 (keyboard focus)**: On a mobile device (or browser devtools mobile simulation), enter a guess using the on-screen keyboard and press Go — the native keyboard must NOT pop up. Then type a guess using the native keyboard and press Go — the native keyboard SHOULD remain open / refocus.
4. **Phase 3 (pill badge)**: Open Past Puzzles — completed days show a green pill, not plain text.
5. **Phase 4 (View Guesses)**: Expand a completed day in Past Puzzles → each guesser row with recorded guesses shows a blue "View Guesses" button → tapping it opens the detail page with header summary and full tile view → "← Back" returns to Past Puzzles.
6. **Phase 5 (play guard)**:
   - Log in as a player who has NOT set tomorrow's word → Lobby CTA 2 shows disabled play button with "Set tomorrow's word above" message. Set tomorrow's word → button enables.
   - Navigate directly to `/play` without tomorrow's word set → amber banner appears with inline form; panels are dimmed. Submit tomorrow's word → banner disappears, panels activate.
   - Navigate directly to `/play` having set both words → no banner, normal play.

## Decisions & Scope

- **Phase 1**: Only `release-agent.agent.md` needs to be updated; the Routine C logic in the system `modeInstructions` is derived from this file. The existing historical release branches (v1.0–v1.11) will be cleaned up manually by the release agent as a one-off task at the end of this release, using `git branch -d` and `git push origin --delete` for each.
- **Phase 2**: The `shouldFocusAfterSubmit` approach uses a ref value evaluated at render time. This works correctly because any OSK key press triggers a `setInputValue` re-render before the user can press Go, ensuring the prop reflects the current input source.
- **Phase 4**: `PastPuzzleDetail` is intentionally not in the navbar. It is reachable only via the "View Guesses" button in Past Puzzles. If `date`, `setterId`, or `guesserId` params don't match real data (e.g. manual URL), the page will show 0 guesses gracefully.
- **Phase 5**: The `usedWords` uniqueness check is skipped in the inline PuzzleView word forms — this is an acceptable trade-off for the edge-case path. Full validation remains in Lobby. `DayStatus` needs to be imported in PuzzleView (it exists in `app/src/types/index.ts`).
- **Out of scope**: Extracting word-submission logic into a shared utility (Lobby and PuzzleView duplicate it). Not done to avoid over-engineering.
- **Spec updates**: `spec-implementation.md` routing table, `spec-game-design.md` past puzzles section, and the play-guard rules should all be updated to reflect these changes.
