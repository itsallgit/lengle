# Release v1.7 — Home page redesign, practice mode, leaderboard rework, and bug fixes

## Overview

| Field | Value |
|---|---|
| Release | v1.7 |
| Branch | release/v1.7 |
| Date | 2026-04-05 |
| Status | Done |

### Summary
A large release across all areas of the app. The puzzle guess row layout is corrected so everything stays on one row with a new "Reset Tiles" button. The Lobby is renamed to Home and rebuilt with three clear call-to-actions, an in-page emoji picker, a word submission status table for today and tomorrow, and version display. A fully client-side Practice Puzzle mode is added. The Leaderboard Today tab is reorganised and the All Time tab is completely redesigned with a new scoring model. The Trends tab is deleted. A Word History data-loading bug is investigated and fixed.

### Changes included
- **Guess row layout** — tiles autoscale to fill screen width; never overflows; count-based mini tile rows (green/orange/grey, not per-position)
- **Tile colour cycle** — default → green → orange → grey → default (no lightgrey step)
- **Reset Tiles button** — always visible, persistent; disabled with "Tap guess tiles to change colours" when no overrides; enabled with "Tap to reset guess tiles" when overrides exist; spans tile width
- **In-home emoji picker** — tapping the emoji in the greeting opens the picker; no separate emoji button; expanded ~80 options
- **Home page redesign** — renamed from Lobby; no "Home" subtitle in greeting; three full-width CTA buttons ("Play Today's Puzzles", "Play Practice Puzzle"); word submission status table; version number at bottom
- **Practice Puzzle** — new `/practice` route; random word from wordlist; fully client-side; no S3 writes
- **Leaderboard Today tab** — "Daily Scores" section first; winner section only shown when ALL players complete ALL puzzles; grey "?" tiles (not ❓ emoji) for unsolved; per-puzzle sections with word tile reveal
- **Leaderboard All Time tab** — completed-day count with padded description; stats as a single table with orange "Guesses to Solve" and green "Guesses from Others" column headers
- **Trends tab removed** — tab and component deleted
- **Word History complete rewrite** — accordion per day with completion indicator; each expanded day shows 3 puzzle sections with green/grey word tiles; per-player guess counts; grey "?" tile for incomplete
- **Nav updates** — "LENGLE" as green letter tiles in header when on home page; "Home", "Practice", "Leaderboard" labels; Practice link added
- **package.json version** — bump to `1.7.0`; version displayed as `v1.7.0` at bottom of Home page

---

## Implementation Plan

> **IMPORTANT FOR BUILD AGENT:** The v1.7 implementation has already been started. You are **updating and correcting an existing implementation**, not building from scratch. Before making any changes, read each affected file to understand the current state. The changes below reflect feedback from local testing and must be applied on top of whatever is already in place.

> Phases 1 and 4 (puzzle components and leaderboard) are independent of Phase 2 (home page) and can be implemented in parallel. Phase 3 (practice) depends on Phase 1 (reused components). Phase 5 (history rewrite) is independent. Phase 6 (nav) may have dependencies on Phase 2 (home page structure).

---

### Phase 1 — Guess row layout + Reset Tiles + mini tile fix

#### 1a. `app/src/components/Puzzles/GuessRow.tsx` — fix mini tile display, tile cycle, and autoscale

> **Testing found two correctness bugs and one layout issue that must be fixed.**

**Bug 1 — Mini tiles showing per-position (Wordle-style) — WRONG:**
The current implementation shows 5 colour dots in letter order (i.e. position-specific), which is fundamentally wrong for Lengle. Lengle must NEVER show positional information. The mini tile display must be **count-based only**.

**Correct mini tile behaviour:**
- Count the number of green (score 0), orange (score 1), and grey (score 3) letters from `perLetterScores`
- Display 3 stacked rows:
  - Row 1: N× small green squares (one per green letter)
  - Row 2: N× small orange squares (one per orange letter)
  - Row 3: N× small grey squares (one per grey letter)
- A row is visually absent if its count is 0 (don't render empty rows)
- These 3 rows are grouped together and appear on the same main row line as the guess word tiles (far right of the row)
- Small square size: `h-2.5 w-2.5`, gap between squares: `gap-0.5`, gap between rows: `gap-0.5`
- Colour classes: green → `bg-green-500`, orange → `bg-orange-400`, grey → `bg-gray-400`

**Bug 2 — Tile colour cycle is wrong:**
The cycle must be: `null` (default dark blue-grey) → `green` → `orange` → `grey` → back to `null`. There is **no** `lightgrey` step. Remove `lightgrey` from `TileOverride` entirely.

Updated types:
- `type TileOverride = 'green' | 'orange' | 'grey' | null`
- `CYCLE: TileOverride[] = ['green', 'orange', 'grey', null]`
- Remove the `lightgrey` entry from `COLOR_CLASS` if it exists

**Layout issue — wasted space on the right:**
Guess tiles should autoscale to fill the available container width without overflowing. Use a `w-full` container with `flex` that distributes space evenly among the 5 tiles. The tile size should be computed to use all available width (e.g., use `flex-1` on each tile with `aspect-square` rather than fixed `h-10 w-10`) so there is no dead space on the right side. Ensure the mini tile group and row number have fixed widths so they don't affect the tile scaling.

**No change to `perLetterScores` data** — the scoring logic is correct, only the visual representation changes.

**Full component signature (unchanged from before):**
```ts
interface GuessRowProps {
  rowNumber: number
  word: string
  total: number
  perLetterScores: number[]
  overrides: (TileOverride | null)[]
  onOverrideChange: (tileIndex: number, value: TileOverride | null) => void
}
```

#### 1b. `app/src/components/Puzzles/GuessList.tsx` — own overrides state, persistent Reset Tiles button

> **Testing found a UX bug: the show/hide Reset Tiles button causes layout shifts. The button must be ALWAYS VISIBLE.**

- Accept `guesses: GuessEntry[]` (same as before)
- Maintain `overrides: (TileOverride | null)[][]` state — one entry per guess row, initialised to all-null
- Sync via `useEffect` keyed on `guesses.length`: when a new guess is added, push a fresh all-null row
- `hasOverrides = overrides.some(row => row.some(v => v !== null))`

**Reset Tiles button — always visible, never shown/hidden:**
- The button always renders below the guess list (or above — consistent position)
- It spans the same visual width as the guess tiles (from the left edge of the first tile to the right edge of the last tile — NOT the full row including the row-number column or mini tiles column)
- **When `!hasOverrides` (disabled state):**
  - Button text: `"Tap guess tiles to change colours"`
  - Style: greyed out (e.g. `bg-gray-100 text-gray-400 border border-gray-200 cursor-default`)
  - `disabled` attribute set — not clickable
- **When `hasOverrides` (enabled state):**
  - Button text: `"Tap to reset guess tiles"`
  - Style: visible/active (e.g. `bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300`)
  - Clicking resets all overrides to all-null
- Button visual style: a proper styled button element (not a text link), rounded, fits within the tile area width
- Pass each row's `overrides[i]` and an `onOverrideChange` handler to `<GuessRow>`

#### 1c. `app/src/components/Puzzles/GuessInput.tsx` — minor polish

- Add `shrink-0` to the Go button to prevent it from shrinking on very narrow viewports (no other changes)

---

### Phase 2 — Home page redesign

This replaces the Lobby's render output. The logic (word submission, polling, state machine) largely stays; we're changing the UI structure.

#### 2a. `app/src/lib/config.ts` — expand PRESET_EMOJIS

Add a new top-level export (NOT inside `CONFIG` const since it doesn't need `as const`):

```ts
export const PRESET_EMOJIS: string[] = [
  // Animals (~24)
  '🦁', '🐯', '🦊', '🐺', '🐻', '🐼', '🐨', '🐸', '🦋', '🦅', '🦜', '🐬',
  '🦈', '🦒', '🐘', '🦓', '🦏', '🦛', '🐊', '🦎', '🐢', '🐙', '🦀', '🐉',
  // Nature (~12)
  '🌸', '🌺', '🌻', '🌹', '🌷', '🍀', '🌊', '🔥', '⚡', '🌈', '🌟', '💫',
  // Food (~12)
  '🍕', '🍔', '🌮', '🍣', '🍜', '🍰', '🎂', '🍦', '🍩', '🍪', '🍇', '🍓',
  // Activities & Objects (~18)
  '🎯', '🎸', '🎮', '🎭', '🎨', '🎲', '🏆', '🎪', '🎬', '🎤', '🎹', '🚀',
  '💎', '🔮', '🧩', '⚽', '🏀', '🎻',
  // Faces & Misc (~14)
  '🤠', '🧙', '🦸', '🧚', '🤖', '👾', '🎃', '🌙', '☀️', '🌤️', '🍁', '🌿',
  '🍄', '🌵',
]
```

(~80 emojis total)

#### 2b. `app/src/components/Lobby/Lobby.tsx` — full render rewrite + tomorrow status fetch

> **Testing found several UX issues: the separate emoji button should be removed, the "Home" subtitle should be removed, and CTA buttons should be full-width.**

**Data additions (fetch on mount):**
- Fetch ALL players' word files for BOTH today and tomorrow to build the status table:
  ```
  data/words/${todayDate}/${player.id}.json  (3 files)
  data/words/${tomorrowDate}/${player.id}.json  (3 files)
  ```
- Store as `todaySetByPlayer: Record<string, boolean>` and `tomorrowSetByPlayer: Record<string, boolean>`
- `playerHasSetToday` remains the local player's own today status (existing)
- `tomorrowWord` remains the local player's own tomorrow word (existing)

**New state:**
```ts
const [todaySetByPlayer, setTodaySetByPlayer] = useState<Record<string, boolean>>({})
const [tomorrowSetByPlayer, setTomorrowSetByPlayer] = useState<Record<string, boolean>>({})
```

**Emoji picker state** (local to Lobby):
```ts
const [showEmojiPicker, setShowEmojiPicker] = useState(false)
```
Use `usePlayer()` to access `setPlayerEmoji` and `playerEmojis`.

**New render structure:**
```
<div min-h-screen bg-gray-50>
  <Header />
  <main max-w-lg mx-auto px-4 py-8 space-y-6>

    {/* Greeting — NO separate emoji button in top right, NO "Home" subtitle */}
    <div>
      <h1>
        {/* Tapping the emoji toggles the emoji picker */}
        <button onClick={() => setShowEmojiPicker(v => !v)} class="text-2xl ...">
          {currentEmoji}
        </button>
        {" "}Hi, {currentPlayerName}!
      </h1>
      {/* Do NOT render a "Home" subtitle <p> here */}
    </div>

    {/* Emoji picker dropdown (visible when showEmojiPicker) */}
    {showEmojiPicker && (
      <section class="rounded-xl border bg-white p-4 shadow-sm">
        <p text-sm font-medium mb-2>Choose your emoji</p>
        <div grid grid-cols-8 gap-1>
          {PRESET_EMOJIS.map(emoji => <button .../>)}
        </div>
      </section>
    )}

    {/* Word submission status table */}
    {!loading && <WordStatusTable todayDate={todayDate} tomorrowDate={tomorrowDate}
       todaySetByPlayer={todaySetByPlayer} tomorrowSetByPlayer={tomorrowSetByPlayer} />}

    {/* CTA 1: Set word(s) — shown if current player has not set today's OR tomorrow's word */}
    {/* CTA 2: Play Today's Puzzles — shown only if lobbyState === 'C' */}
    {/* CTA 3: Play Practice Puzzle — always shown */}
    {!loading && <CTASection ... />}

    {/* Version number */}
    <p text-xs text-gray-400 text-center>v{__APP_VERSION__}</p>

  </main>
</div>
```

**CTA styling — all three use consistent card style:**
```
rounded-xl border p-6 shadow-sm text-center
```
Active/playable CTAs: `bg-violet-700` button inside. Pending/waiting CTAs: `bg-gray-200` button (disabled appearance).

**ALL CTA buttons must span the full width of their container** (`w-full` on every button in the CTA section).

**CTA 1 — Set Words:**
- If `!playerHasSetToday`: show "Set Today's Word" form inline (WordSetForm), OR a violet button that expands the form. Use the existing WordSetForm component.
- If `playerHasSetToday && !tomorrowWord`: show "Set Tomorrow's Word" as a violet-700 CTA button that expands the WordSetForm for tomorrow. This replaces the current collapsible.
- If both set: show a small subtle "Words set ✓" indicator (not a card, just text) or hide entirely.
- State A/B handling: if `!playerHasSetToday`, the first CTA is the today word form (prominent). State B waiting message can appear below it or replace it.

**CTA 2 — Play Today's Puzzles:**
- Only shown when `lobbyState === 'C'`
- Violet-700 button `w-full onClick={() => navigate('/play')}`
- When `lobbyState === 'B'`: show a greyed-out "waiting for others…" state instead with player names

**CTA 3 — Play Practice Puzzle:**
- Always visible
- Violet-700 button `w-full onClick={() => navigate('/practice')}`
- Button text: `"Play Practice Puzzle"` (not "Practice Puzzle")
- Short subtitle: "Play with a random word — no scores saved"

**Update `submitWord` for tomorrow:** when submitting tomorrow's word, also update `tomorrowSetByPlayer[playerId] = true`.
**Update `submitWord` for today:** after success, also update `todaySetByPlayer[playerId] = true`.

   > **Resolved (Build Agent):** After a successful tomorrow submit, call `setTomorrowSetByPlayer(prev => ({ ...prev, [playerId]: true }))`. After a successful today submit, call `setTodaySetByPlayer(prev => ({ ...prev, [playerId]: true }))`.

   > **Resolved (Build Agent):** When both today and tomorrow words are set, show a subtle text-only confirmation "✅ Words set for today and tomorrow" in place of CTA 1 (instead of hiding entirely).

   > **Resolved (Build Agent):** In State B, CTA 2 renders as a card with the same `rounded-xl border p-6` style, containing a disabled `bg-gray-200` button and a waiting message with player names.

#### 2c. `app/src/components/Lobby/PlayerStatusList.tsx` — replace with word status table

   > **Resolved (Build Agent):** Fully replace `PlayerStatusList`'s export with the new table component (new props: `todayDate`, `tomorrowDate`, `todaySetByPlayer`, `tomorrowSetByPlayer`) and update the import call in `Lobby.tsx` accordingly.

Rewrite (or replace the usage) to render the three-column table described in item 5:

| Player | Today (date subtitle) | Tomorrow (date subtitle) |
|---|---|---|
| 🎯 Troy | ✅ | ⏳ |
| 🌸 Mum | ✅ | ✅ |
| ⚡ Dad | ⏳ | ⏳ |

- Header row: **TODAY** with `{todayDate formatted as d MMM}` as subtitle; **TOMORROW** with `{tomorrowDate formatted}`
- Emoji for done and pending are the **same emoji** — use ✅ for done and ⏳ for not set (or player emoji for "done" and a grey circle for "not set") — **actually, re-reading item 5: "We can use the same emoji for pending and done"** — this is ambiguous. Interpret as: use a consistent visual indicator, specifically the player's own emoji in the row (column 1) and ✅ for set / ⏳ for pending in the day columns.
- Props: `todayDate: string`, `tomorrowDate: string`, `todaySetByPlayer: Record<string, boolean>`, `tomorrowSetByPlayer: Record<string, boolean>`

Rename file approach: keep `PlayerStatusList.tsx` but replace its exports with the new component signature.

#### 2d. `app/vite.config.ts` — expose app version

   > **Resolved (Build Agent):** `resolveJsonModule` is already `true` in `app/tsconfig.json` — no tsconfig changes needed.

```ts
import pkg from './package.json'

export default defineConfig({
  // existing config...
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
```

#### 2e. `app/src/vite-env.d.ts` — declare global

```ts
declare const __APP_VERSION__: string
```

#### 2f. `app/package.json` — bump version

Change `"version": "0.0.1"` to `"version": "1.7.0"`.

---

### Phase 3 — Practice Puzzle

#### 3a. `app/src/components/Puzzles/PracticeView.tsx` — new file

Full client-side puzzle panel. No S3 reads or writes.

```ts
// State
const [targetWord, setTargetWord] = useState<string>(() => pickRandomWord())
const [guesses, setGuesses] = useState<GuessEntry[]>([])
const [isNewWordAnimating, setIsNewWordAnimating] = useState(false)

function pickRandomWord(): string {
  const words = Array.from(WORD_LIST)
  return words[Math.floor(Math.random() * words.length)].toUpperCase()
}

function handleGuessSubmit(word: string) {
  const result = scoreGuess(word, targetWord)
  const newEntry: GuessEntry = {
    puzzle_setter_id: 'practice',
    guess_number: guesses.length + 1,
    word,
    per_letter_scores: result.perLetter,
    score: result.total,
    is_correct: result.isCorrect,
    submitted_at: new Date().toISOString(),
  }
  setGuesses(prev => [...prev, newEntry])
}

function handleNewWord() {
  setTargetWord(pickRandomWord())
  setGuesses([])
}

const isSolved = guesses.some(g => g.is_correct)
```

**Render:**
```
<div min-h-screen bg-gray-50>
  <Header />
  <main max-w-lg mx-auto px-4 py-8 space-y-4>
    <div>
      <h1 text-2xl font-bold>Practice Puzzle</h1>
      <p text-sm text-gray-500>Random word · no scores saved</p>
    </div>

    {/* Solved state */}
    {isSolved && (
      <div rounded-xl border-green-200 bg-green-50 p-4>
        <p>Solved in {guesses.length} guesses! 🎉</p>
        <p font-mono text-green-700 text-lg tracking-widest>{targetWord}</p>
        <button onClick={handleNewWord} class="mt-3 rounded-xl bg-violet-700 ...">
          Play Again
        </button>
      </div>
    )}

    {/* Guess list */}
    <GuessList guesses={guesses} />

    {/* Guess input (hidden once solved) */}
    {!isSolved && (
      <GuessInput
        onSubmit={handleGuessSubmit}
        disabled={false}
        ownWord={null}   {/* No self-guess restriction in practice mode */}
      />
    )}
  </main>
</div>
```

#### 3b. `app/src/App.tsx` — add practice route

```tsx
import PracticeView from './components/Puzzles/PracticeView'

// Inside ProtectedRoute routes:
<Route path="/practice" element={<PracticeView />} />
```

---

### Phase 4 — Leaderboard rework

#### 4a. `app/src/components/Leaderboard/TodayTab.tsx` — reorganise + puzzle tile reveal

> **Testing found two issues: (1) the winner section must only show when all players have finished, and (2) the ❓ emoji should be replaced with a grey tile showing "?".**

**New render order:**
1. "Daily Scores" section (was "Daily Totals", moved to top)
2. Per-puzzle sections (each with word tile display + guesser table)

**"Daily Scores" table changes:**
- Rename heading from "Daily Totals" to "Daily Scores"
- For a player who has NOT solved both puzzles (`solved < 2`), show a small grey tile component displaying `"?"` instead of a number in the Total column (NOT the ❓ emoji — render as a styled grey square/tile element consistent with the game's tile visual language)
- Remove the "Solved" column

**Winner section — conditional on ALL players completing ALL puzzles:**
- The daily winner announcement/trophy row at the top of Today tab must only render when **all players have completed both daily puzzles** (i.e. every player has `solved === 2`)
- When NOT all players have finished: show a message in its place: `"Not all players have completed today's puzzles"` (de-emphasised text, e.g. `text-sm text-gray-500`)
- This replaces the legend/note that described the ❓ meaning

**Per-puzzle sections — add word tile reveal:**
In each puzzle card, above the guesser table, show the puzzle word as tiles:
- If ALL non-setter players have `is_correct === true` for this puzzle (`puzzle.allSolved === true`): show green letter tiles
- Otherwise: show 5 grey tiles with `?` characters
- Need to fetch word file: `data/words/${date}/${setterId}.json` — add this to the data loading in the `useEffect`

Update `PuzzleStats` interface:
```ts
interface PuzzleStats {
  setterId: string
  setterName: string
  setterDisplay: string
  guessCounts: Record<string, number | null>
  winnerIds: string[]
  word: string | null   // only populated when allSolved
  allSolved: boolean
}
```

Update `TodayData`:
```ts
interface TodayData {
  results: DayResults | null
  playerGuesses: Record<string, PlayerGuesses | null>
  puzzleWords: Record<string, string | null>  // setterId → word
}
```

In data loading, also fetch: `Promise.all(CONFIG.players.map(p => readJson<PuzzleWord>(\`data/words/${date}/${p.id}.json\`)))`.

   > **Resolved (Build Agent):** Fetch word files using `readJson<PuzzleWord>(...)` and store `pw?.word ?? null` in `puzzleWords`. Derive `allSolved` from `guessCounts` — `allSolved = Object.values(guessCounts).every(c => c !== null)`.

**Per-puzzle guesser table changes:**
- Show a small grey `"?"` tile (styled element, NOT ❓ emoji) instead of `—` when `count === null` (player hasn't solved yet)
- Show trophy for puzzle winner (keep existing logic)
- Keep exact same column structure as before

**Grey "?" tile helper:** Create a small inline reusable component (or just a styled span) used consistently across Today tab wherever an unsolved/unknown value would otherwise be shown: a square with `bg-gray-600 text-white` (or similar dark tile) containing the character `?`, sized appropriately for its context (small in table cells).

#### 4b. `app/src/components/Leaderboard/AllTimeTab.tsx` — complete rewrite

> **Testing found three UX issues: (1) insufficient padding on the description text under the hero stat, (2) "guesses to solve" and "guesses from others" should use game colours (orange and green respectively), and (3) the per-player layout should be a table with column headers rather than repeating section headers for each player.**

   > **Resolved (Build Agent):** Show all stats even when `completedDayCount === 0` — scores will naturally be 0, which is accurate and simpler than a special empty state.

**New data model:**

```ts
interface AllTimeStats {
  completedDayCount: number   // days where all 3 players solved all puzzles
  totalPastDays: number
  // Per-player scores (complete days only):
  guesserScore: Record<string, number>       // guesses player made on others' words
  wordSetterScore: Record<string, number>    // guesses others made on player's words
  overallWinnerIds: string[]                 // player(s) with lowest guesserScore
}
```

**A "completed daily puzzle"** = a day where every player has `is_correct === true` for every other player's puzzle (all 6 guesser×puzzle combinations solved).

**Data loading** — reuse the same pattern as existing AllTimeTab (list past dates, fetch all guess files) but with new computation:

```ts
// For each past date, determine if it's a completed day:
function isCompletedDay(
  date: string,
  guessesPerPlayer: (PlayerGuesses | null)[][]  // [playerIndex][dateIndex]
  dateIndex: number
): boolean {
  for (let pi = 0; pi < CONFIG.players.length; pi++) {
    const guesser = CONFIG.players[pi]
    const pg = guessesPerPlayer[pi][dateIndex]
    if (!pg) return false
    for (const setter of CONFIG.players) {
      if (setter.id === guesser.id) continue
      const forPuzzle = pg.guesses.filter(g => g.puzzle_setter_id === setter.id)
      if (!forPuzzle.some(g => g.is_correct)) return false
    }
  }
  return true
}
```

**Scoring (completed days only):**
```ts
// guesserScore: total guesses player made on all other players' puzzles
// wordSetterScore: total guesses others made on player's puzzle words
for each completedDate:
  for each player P (guesser):
    pg = guessesPerPlayer[P][date]
    for each setter S (S !== P):
      forPuzzle = pg.guesses.filter(g.puzzle_setter_id === S.id)
      guesserScore[P.id] += forPuzzle.length
      wordSetterScore[S.id] += forPuzzle.length
```

**`overallWinnerIds`** = player(s) with the LOWEST `guesserScore`.

**New render layout:**

```
<div class="space-y-8">

  {/* Hero stat: completed days */}
  <div text-center>
    <p text-6xl font-black text-gray-900>{stats.completedDayCount}</p>
    <p text-sm text-gray-500 mt-1>Completed puzzle days</p>
    {/* Padding: use px-8 or px-10 on the explanation text so it doesn't run full-width */}
    <p text-xs text-gray-400 mt-1 class="px-8">
      A completed puzzle day is when all three players finish all puzzles.
      Only completed days count toward total scores.
    </p>
  </div>

  {/* Overall leaderboard */}
  <div class="rounded-xl border bg-white p-4 shadow-sm">
    <h2 text-sm font-bold mb-3>Total Scores</h2>
    {/* Table: Player | Score | Trophy */}
    {/* Sorted by guesserScore ascending */}
    {/* Winner highlighted in amber */}
    <p text-xs text-gray-400 mt-2>Lowest score wins.</p>
  </div>

  {/* Per-player stats — TABLE format with column headers, NOT individual cards per player */}
  <div class="rounded-xl border bg-white p-4 shadow-sm">
    <table class="w-full text-sm">
      <thead>
        <tr>
          <th class="text-left font-medium text-gray-700">Player</th>
          {/* "Guesses to Solve" header in orange (text-orange-500 or matching game orange) */}
          <th class="text-center font-medium text-orange-500">Guesses to Solve</th>
          {/* "Guesses from Others" header in green (text-green-600 or matching game green) */}
          <th class="text-center font-medium text-green-600">Guesses from Others</th>
        </tr>
        <tr class="text-xs text-gray-400">
          <th></th>
          <th class="text-center">(lower is better)</th>
          <th class="text-center">(higher is better)</th>
        </tr>
      </thead>
      <tbody>
        {CONFIG.players.map(player => (
          <tr key={player.id}>
            <td>{displayName(player.id)}</td>
            <td class="text-center font-bold">{stats.guesserScore[player.id]}</td>
            <td class="text-center font-bold">{stats.wordSetterScore[player.id]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

</div>
```

**Key changes from original per-player card layout:**
- Remove the individual `<div>` card per player with repeated "guesses to solve" / "guesses from others" labels
- Replace with a single table where the column headers appear once at the top
- Orange for "Guesses to Solve" column header (use `text-orange-500` or the project's orange shade)
- Green for "Guesses from Others" column header (use `text-green-600` or the project's green shade)
- Match the exact orange/green shades used elsewhere in the game (check `spec-color-theme.md` and existing components for the canonical values)

#### 4c. `app/src/components/Leaderboard/Leaderboard.tsx` — remove Trends tab

- Remove the Trends tab button from the tab bar
- Remove the conditional render of `<TrendsTab />`
- Remove the import of TrendsTab
- Default active tab changes to `'today'` (unchanged, already is)
- The `TrendsTab.tsx` file can be left in place but unused (build agent can optionally delete it, but do NOT delete if it causes any type errors — just leave it)

   > **Resolved (Build Agent):** User wants `TrendsTab.tsx` fully deleted. Delete the file as well as removing its import and usage in `Leaderboard.tsx`.

---

### Phase 5 — Word History complete rewrite

> **The previous approach of debugging the old Word History was abandoned. The page is to be completely rewritten from scratch.** Delete all existing content in `WordHistory.tsx` and `DayEntry.tsx` and replace with the new design below. Do not attempt to preserve any of the old logic.

#### 5a. `app/src/components/WordHistory/WordHistory.tsx` — full rewrite (accordion container)

**Data loading:**
- List all past dates: `listS3Keys('data/days/')` → extract date strings, filter out the active puzzle date
- For each past date, fetch:
  - `data/days/{date}/results.json` → `DayResults` (to determine completion status)
  - `data/words/{date}/{player.id}.json` → puzzle word for each of the 3 players
  - `data/days/{date}/{player.id}.json` → guess file for each of the 3 players
- Store loaded data per date in state; load eagerly on mount for all past dates

**Completion check per day:** a day is "all completed" if results.json exists AND all 6 non-setter player×puzzle combinations have `is_correct === true`. If results.json is absent, derive from guess files directly.

**Render:**
```tsx
<div min-h-screen bg-gray-50>
  <Header />
  <main max-w-lg mx-auto px-4 py-8 space-y-2>
    <h1 class="text-2xl font-bold mb-4">Word History</h1>

    {/* Reverse-chronological list of accordion items */}
    {pastDates.map(date => (
      <WordHistoryDay
        key={date}
        date={date}
        dayData={loadedData[date] ?? null}
      />
    ))}

    {pastDates.length === 0 && (
      <p class="text-gray-500 text-sm">No past puzzle days yet.</p>
    )}
  </main>
</div>
```

#### 5b. `app/src/components/WordHistory/DayEntry.tsx` — full rewrite (accordion item)

Export as `WordHistoryDay` (keep the file name `DayEntry.tsx`).

**Props:**
```ts
interface WordHistoryDayProps {
  date: string            // 'YYYY-MM-DD'
  dayData: DayData | null // null = still loading
}

interface DayData {
  allCompleted: boolean
  puzzles: PuzzleData[]
}

interface PuzzleData {
  setterId: string
  word: string | null         // null if not all players finished this puzzle
  allFinished: boolean        // all non-setter players solved this puzzle
  guesserResults: GuesserResult[]
}

interface GuesserResult {
  playerId: string
  guessCount: number | null   // null if player did not complete the puzzle
}
```

**Accordion header:**
```tsx
<button onClick={toggleExpanded} class="w-full flex items-center justify-between ...">
  <span class="font-medium">{formatDate(date)}</span>  {/* e.g. "Wednesday 2 April 2026" */}
  <span>
    {dayData?.allCompleted
      ? <span class="text-green-600">✓ All completed</span>
      : <span class="text-gray-400">Not all completed</span>
    }
    {/* Chevron icon */}
  </span>
</button>
```

**Expanded content — 3 sections (one per puzzle setter), in CONFIG.players order:**
```tsx
{CONFIG.players.map(player => {
  const puzzle = dayData?.puzzles.find(p => p.setterId === player.id)
  return (
    <div key={player.id} class="py-3 border-t first:border-t-0">
      {/* Puzzle word display + setter identity on same row */}
      <div class="flex items-center gap-3 mb-2">
        {/* Word tiles: green letter tiles if allFinished, 5 grey '?' tiles if not */}
        <WordTiles word={puzzle?.word ?? null} finished={puzzle?.allFinished ?? false} />
        <span>{playerEmojis[player.id]} {player.name}</span>
      </div>

      {/* Guess counts for other players */}
      {CONFIG.players
        .filter(p => p.id !== player.id)
        .map(guesser => {
          const result = puzzle?.guesserResults.find(r => r.playerId === guesser.id)
          return (
            <div key={guesser.id} class="flex items-center gap-2 text-sm text-gray-600 ml-2">
              <span>{playerEmojis[guesser.id]} {guesser.name}</span>
              <span>—</span>
              {result?.guessCount != null
                ? <span>{result.guessCount} guesses</span>
                : <GreyQuestionTile />  {/* single grey '?' tile for incomplete */}
              }
            </div>
          )
        })
      }
    </div>
  )
})}
```

**`WordTiles` helper (inline sub-component or small function):**
- `finished === true` and `word !== null`: 5 green letter tiles (`bg-green-500 text-white`), one per letter
- Otherwise: 5 grey tiles each showing `?` (`bg-gray-500 text-white`)
- Tile size: `h-8 w-8 text-sm` to fit neatly on mobile

**`GreyQuestionTile` helper (inline sub-component):**
- Single small square tile displaying `?`
- Style: `bg-gray-500 text-white h-6 w-6 text-xs flex items-center justify-center rounded`
- Reuse the same component in `TodayTab.tsx` wherever unsolved/unknown status is shown (see Phase 4a) — keep it visually consistent

---

### Phase 6 — Navigation updates

#### 6a. `app/src/components/shared/Nav.tsx` and `app/src/components/shared/Header.tsx` — update labels, LENGLE tiles on home, add Practice

**Nav link labels:**
```ts
const NAV_LINKS: NavLink[] = [
  { to: '/lobby', label: 'Home' },
  { to: '/play', label: 'Play' },
  { to: '/practice', label: 'Practice' },    // new
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/history', label: 'History' },
]
```
The Nav dropdown now has 5 links — increase `max-h-48` to `max-h-64` to accommodate.

**LENGLE title in header when on home page:**
- In `Header.tsx` (or wherever the nav header title is rendered), detect the current route using `useLocation()` from react-router-dom
- When the current path matches `/lobby` (or the home route), render the header title as individual green letter tiles spelling "LENGLE" — each letter in a coloured square tile
- Use the same tile visual style as the play selection screen: each letter rendered as a small `bg-green-500 text-white font-bold` tile (or whatever the existing tile style class is in the codebase — check the existing tile component usage)
- When on any other page, render the page name as plain text as before
- Example: instead of `<span>Home</span>`, render `<div class="flex gap-1">{'LENGLE'.split('').map(letter => <span class="bg-green-500 text-white px-1.5 py-0.5 rounded text-sm font-bold">{letter}</span>)}</div>`

---

### Phase 7 — Spec updates

> **Note:** `specs/spec-game-design.md` has already been updated in this release cycle to reflect the v1.7 changes including the corrected mini tile display, tile cycle, reset button behaviour, home page, nav, leaderboard, and word history. The build agent must NOT re-update spec-game-design.md — those updates are already done.

Update `specs/spec-implementation.md`:
- Add `/practice` route and `PracticeView.tsx` to screen inventory
- Update Lobby → Home page description
- Note `__APP_VERSION__` vite define pattern
- Note expanded emoji list in config.ts
- Note `GreyQuestionTile` component used in TodayTab and WordHistory for unsolved/unknown indicators

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. Manual: Play screen guess row — no overflow on 375px viewport; tiles fill available width with no dead space on the right
4. Manual: Mini tiles show COUNT-based rows (all greens, then all oranges, then all greys) — NOT per-position dots
5. Manual: Tap a guess tile — cycles default → green → orange → grey → default (no lightgrey)
6. Manual: Reset Tiles button always visible; greyed out with correct text when no overrides; active with correct text when overrides exist
7. Manual: Home page — tapping the emoji in the greeting opens the emoji picker; no separate emoji button
8. Manual: Home page — no "Home" subtitle visible under the welcome message
9. Manual: Home page — "Play Today's Puzzles" and "Play Practice Puzzle" buttons span full container width
10. Manual: CTA 3 button text says "Play Practice Puzzle"
11. Manual: Home page emoji picker shows ~80 options; selecting one updates greeting immediately
12. Manual: Word submission table shows all 3 players' today/tomorrow status correctly
13. Manual: Set tomorrow's word via the CTA — table updates
14. Manual: Navigate to /practice — random word loads; guess correctly — word revealed; "Play Again" picks a new word
15. Manual: Leaderboard Today tab — winner section hidden until ALL players complete ALL puzzles; message shown instead
16. Manual: Leaderboard Today tab — grey "?" tiles (not ❓ emoji) for unsolved counts
17. Manual: Leaderboard All Time tab — completed day count with padded description; stats shown as a table with orange/green column headers
18. Manual: Trends tab is gone from leaderboard
19. Manual: Word History — accordion view with correct day headers and completion indicators
20. Manual: Word History — expanded day shows 3 puzzle sections, each with word tiles and per-player guess counts
21. Manual: Nav header shows "LENGLE" as green letter tiles when on the home page
22. Manual: Nav labels — "Home", "Practice", "Leaderboard" all correct
23. Manual: Home page footer shows `v1.7.0`

---

## Decisions & Scope

- **Mini tiles: count-based not position-based:** The mini tile indicators show only the COUNT of green/orange/grey letters (Lengle is not Wordle). Earlier plan described per-position dots — this has been corrected. 3 stacked rows (green, orange, grey), each row containing N squares.
- **Tile colour cycle:** `lightgrey` removed entirely. Cycle is now: default → green → orange → grey → default.
- **Reset Tiles button:** Changed from show/hide (causes layout shifts) to always-visible with disabled/enabled states and descriptive button text.
- **Tile autoscale:** Tiles use `flex-1 aspect-square` rather than fixed size to fill available width without dead space.
- **Home page emoji trigger:** The emoji in the greeting is the trigger for the emoji picker. No separate top-right emoji button.
- **Home page CTA button labels:** "Play Practice Puzzle" (not "Practice Puzzle"). All CTA buttons are `w-full`.
- **Home page greeting:** No "Home" subtitle text.
- **Leaderboard winner section:** Only shown when ALL players have completed ALL puzzles. Replaces the old always-visible winner row.
- **Grey "?" tile vs ❓ emoji:** A styled tile element (grey square with "?") is used throughout. No red ❓ emoji anywhere in the app for game state indicators.
- **All Time tab layout:** Single table with column headers (orange "Guesses to Solve", green "Guesses from Others") for all players — not individual cards per player.
- **LENGLE in nav:** Header shows "LENGLE" as green letter tiles only on the home page route.
- **Word History:** Complete rewrite as accordion. Old debugging approach abandoned.
- **Practice Puzzle uses GuessEntry with `puzzle_setter_id: 'practice'`:** Reuses existing components cleanly without duplication.
- **TrendsTab.tsx:** Fully deleted (including file) as resolved in earlier build session.
- **spec-game-design.md:** Already updated in this release cycle — build agent must not re-update it.
- **Out of scope:** Infinite scroll/pagination for Word History, notifications when others set words, PWA/offline support.
