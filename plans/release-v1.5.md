# Release v1.5 — Guess row numbers, padding fix, tile colour cycling, and emoji polling

## Overview

| Field | Value |
|---|---|
| Release | v1.5 |
| Branch | release/v1.5 |
| Date | 2026-04-05 |
| Status | Done |

### Summary
Four UX improvements based on real play sessions. Two are cosmetic (row numbers and padding), one is a local-only annotation tool (tile colour cycling), and one fixes a data-freshness bug where emoji changes by one player were not visible to others until a hard reload.

### Changes included
- **Row numbers** — Each guess row in the play view gets a small number on the left (1, 2, 3…)
- **Symmetric padding fix** — The expanded puzzle cards have `px-4` but it feels tight on mobile right; increase to `px-5` so the Go button and all content has consistent breathing room
- **Tile colour cycling (local only)** — Clicking a tile in your own past guess rows cycles it through green → orange → grey → default. State is local, not persisted, and resets on navigation or refresh
- **Emoji polling** — Emoji changes by one player now appear for all players within ~60 seconds without a manual reload

---

## Implementation Plan

### Phase 1 — Row numbers (`GuessRow.tsx`, `GuessList.tsx`)

These two changes are tightly coupled and must be done together.

**Step 1.1 — `app/src/components/Puzzles/GuessList.tsx`**

Pass the 1-based row index to `GuessRow`:

```tsx
guesses.map((entry, index) => (
  <GuessRow
    key={`${entry.puzzle_setter_id}-${entry.guess_number}`}
    rowNumber={index + 1}
    word={entry.word}
    total={entry.score}
    perLetterScores={entry.per_letter_scores}
  />
))
```

**Step 1.2 — `app/src/components/Puzzles/GuessRow.tsx`**

Add `rowNumber: number` to `GuessRowProps`. Wrap the existing `<div className="flex items-center gap-2">` content in a wider flex row that includes the row number on the far left:

```tsx
<div className="flex items-center gap-2">
  <span className="w-5 shrink-0 text-right text-xs text-gray-400">{rowNumber}</span>
  <div className="flex gap-1.5">
    {/* tiles */}
  </div>
  <div className="flex flex-col gap-0.5">
    {/* mini score squares */}
  </div>
</div>
```

---

### Phase 2 — Padding fix (`PuzzlePanel.tsx`)

**Step 2.1 — `app/src/components/Puzzles/PuzzlePanel.tsx`**

Change the inner expanded content div from `px-4 pt-4 pb-4` to `px-5 pt-4 pb-4`. This gives 20px on both sides instead of 16px, which provides enough room for the Go button on narrow mobile screens.

The change is on this div (inside the animated height `overflow-hidden` wrapper):
```tsx
<div className="px-5 pt-4 pb-4">
```

---

### Phase 3 — Tile colour cycling (local state only) (`GuessRow.tsx`)

**Step 3.1 — `app/src/components/Puzzles/GuessRow.tsx`**

Add local `useState` for per-letter colour overrides. This is the only file that needs to change for this feature.

- Override state type: `Array<'green' | 'orange' | 'grey' | null>`, initialised with `null` for every letter (= use default colour).
- Cycle order on click: `null → 'green' → 'orange' → 'grey' → null`
- Colour class map:
  - `'green'` → `bg-green-600`
  - `'orange'` → `bg-orange-400`
  - `'grey'` → `bg-gray-700`
  - `null` (default) → `isCorrect ? 'bg-green-600' : 'bg-gray-700'`
- Each tile `<div>` becomes clickable **only when `!isCorrect`**: `onClick={isCorrect ? undefined : () => cycleColor(i)}`, cursor becomes `cursor-pointer` only when the row is not the correct guess.
- The final correct-guess row (where every tile is green because `total === 0`) is non-interactive — tiles render as normal green tiles with no click handler and no cursor change.
- Because state is in `GuessRow`, it resets automatically when the component unmounts (navigation away or refresh). No changes to GuessList or PuzzlePanel needed.
- Add a `title="Click to annotate"` attribute on each tile div (only when `!isCorrect`) for accessibility.

Full implementation sketch:

```tsx
const CYCLE: Array<'green' | 'orange' | 'grey' | null> = ['green', 'orange', 'grey', null]
const COLOR_CLASS: Record<'green' | 'orange' | 'grey', string> = {
  green: 'bg-green-600',
  orange: 'bg-orange-400',
  grey: 'bg-gray-700',
}

const [overrides, setOverrides] = useState<Array<'green' | 'orange' | 'grey' | null>>(
  () => Array(word.length).fill(null),
)

function cycleColor(i: number) {
  setOverrides((prev) => {
    const next = [...prev]
    const current = CYCLE.indexOf(prev[i])
    next[i] = CYCLE[(current + 1) % CYCLE.length]
    return next
  })
}

// In the tile div:
const tileColor = overrides[i] !== null
  ? COLOR_CLASS[overrides[i]!]
  : isCorrect ? 'bg-green-600' : 'bg-gray-700'
```

---

### Phase 4 — Emoji polling (`config.ts`, `App.tsx`)

These two changes are sequential: add config first, then use it in App.

**Step 4.1 — `app/src/lib/config.ts`**

Add `profilePollIntervalMs: 60_000` to the CONFIG object (alongside `lobbyPollIntervalMs`):

```ts
lobbyPollIntervalMs: 30_000,
profilePollIntervalMs: 60_000,
```

**Step 4.2 — `app/src/App.tsx`**

Replace the one-time `useEffect` that fetches `data/players/profiles.json` with `useS3Poll` so that it refreshes every `CONFIG.profilePollIntervalMs` milliseconds.

Import `useS3Poll`:
```ts
import { useS3Poll } from './hooks/useS3Poll'
```

Inside the `App` component, replace:
```ts
useEffect(() => {
  readJson<Record<string, string>>('data/players/profiles.json')
    .then((profiles) => {
      if (profiles) setPlayerEmojis((prev) => ({ ...prev, ...profiles }))
    })
    .catch(() => undefined)
}, [])
```

With:
```ts
const profilesFromS3 = useS3Poll<Record<string, string>>({
  key: 'data/players/profiles.json',
  intervalMs: CONFIG.profilePollIntervalMs,
})

useEffect(() => {
  if (profilesFromS3) {
    setPlayerEmojis((prev) => ({ ...prev, ...profilesFromS3 }))
  }
}, [profilesFromS3])
```

Remove the `readJson` import from `App.tsx` if it is no longer used after this change (verify — it may still be used). Keep `writeToS3` as `setPlayerEmoji` still uses it.

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. Manual: Open play view — each guess row should show a small number (1, 2, 3…) on the left
4. Manual: On mobile, the Go button should have visible padding on the right
5. Manual: Click any letter tile in a past guess — it should cycle green → orange → grey → back to original. Navigating away and back should reset all tiles to their original colours
6. Manual: Change an emoji on one device, wait ~60s on another device (or reload) — the updated emoji should appear without a hard refresh

## Decisions & Scope

   > **Resolved (Build Agent):** Tile cycling is disabled for the final correct-guess row (`isCorrect === true`). Those tiles render as plain non-interactive green. All earlier wrong-guess rows remain annotatable. This was confirmed by the user before implementation began.

- **Tile cycling only applies to non-correct guess rows** — the final solving row (`isCorrect === true`) is locked and renders as normal green tiles with no click handler. Earlier wrong guesses are always annotatable.
- **No persistence for tile overrides** — explicitly local and ephemeral. No S3 writes.
- **Emoji poll interval is 60s** — a reasonable balance between freshness and S3 GET cost. This can be tuned via `CONFIG.profilePollIntervalMs`.
- **`readJson` import in App.tsx** — after Phase 4 the `readJson` import may become unused; the build agent should remove it to avoid a lint warning.
- **Row number width** — `w-5` (20px) is enough for two-digit numbers (guesses 1–15+ fit fine). If someone guesses more than 9 times the number will still display; it just won't be right-aligned to the same column. This is acceptable for now.
