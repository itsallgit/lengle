# Release v1.11 — On-Screen Keyboard

## Overview

| Field | Value |
|---|---|
| Release | v1.11 |
| Branch | release/v1.11 |
| Date | 2026-04-08 |
| Status | Done |

### Summary
Add an on-screen keyboard to the puzzle guess input so players on mobile can type guesses without relying on the native keyboard. Each letter key changes colour to reflect the player's current tile override annotations, giving a visual summary of which letters have been confirmed, eliminated, or are in conflict across all current guesses.

### Changes included
- New `OnScreenKeyboard` component — QWERTY layout with backspace, colour-coded keys, conflict note
- `GuessInput` refactored to a controlled component (value/onChange lifted to parent)
- `GuessList` extended with an `onOverridesChange` callback so parents can track live override state
- `PuzzlePanel` wired up with input value state, override tracking, and the keyboard
- `PracticeView` wired up with input value state and the keyboard (no override colours in practice mode)
- Package version bumped to `1.11.0`
- Specs updated to document the on-screen keyboard feature

---

## Implementation Plan

### Phase 1 — Extend `GuessList` to notify parent of override changes

**File:** `app/src/components/Puzzles/GuessList.tsx`

Add a new optional prop `onOverridesChange?: (overrides: (TileOverride | null)[][]) => void`.

After the existing `overrides` state is defined, add a `useEffect` that calls `onOverridesChange(overrides)` whenever `overrides` changes:

```tsx
useEffect(() => {
  onOverridesChange?.(overrides)
}, [overrides])
```

No other changes to `GuessList` — it keeps full ownership of its override state.

---

### Phase 2 — Make `GuessInput` a controlled component

**File:** `app/src/components/Puzzles/GuessInput.tsx`

**Current props:** `onSubmit`, `disabled`, `ownWord`
**New props to add:** `value: string`, `onValueChange: (v: string) => void`

Changes:
- Remove the internal `const [value, setValue] = useState('')` state
- In `handleChange`, replace `setValue(upper.slice(0, CONFIG.wordLength))` → `onValueChange(upper.slice(0, CONFIG.wordLength))`
- In `handleSubmit`, after `onSubmit(word)`, replace `setValue('')` → `onValueChange('')`
- The `value` in the JSX `<input value={value} ...>` now reads from the prop

The `error` state, `inputRef`, focus-on-enable effect, and all validation logic are unchanged.

---

### Phase 3 — Create `OnScreenKeyboard` component

**New file:** `app/src/components/Puzzles/OnScreenKeyboard.tsx`

#### Props interface
```tsx
interface OnScreenKeyboardProps {
  onLetterPress: (letter: string) => void
  onBackspace: () => void
  disabled: boolean
  guesses: GuessEntry[]
  overrides: (TileOverride | null)[][]
}
```

#### Key colour logic (local helper function `computeKeyColor`)

For a given letter, collect all tile override values for every occurrence of that letter across all guesses:
1. No occurrences → `'default'`
2. All `null` → `'default'`
3. All the same non-null colour → that colour (`'green'` | `'orange'` | `'grey'`)
4. Mix that includes at least one `null` → `'default'`
5. All non-null but not all the same → `'red'` (conflict)

```tsx
type KeyColor = TileOverride | 'red' | 'default'

function computeKeyColor(
  letter: string,
  guesses: GuessEntry[],
  overrides: (TileOverride | null)[][]
): KeyColor {
  const tileValues: (TileOverride | null)[] = []
  guesses.forEach((guess, rowIdx) => {
    guess.word.split('').forEach((char, colIdx) => {
      if (char.toUpperCase() === letter) {
        tileValues.push(overrides[rowIdx]?.[colIdx] ?? null)
      }
    })
  })
  if (tileValues.length === 0) return 'default'
  if (tileValues.some(v => v === null)) return 'default'
  const unique = new Set(tileValues)
  if (unique.size === 1) return tileValues[0]!
  return 'red'
}
```

#### CSS classes per key colour
```tsx
const KEY_BG: Record<KeyColor, string> = {
  default: 'bg-gray-300 text-gray-800',
  green:   'bg-green-600 text-white',
  orange:  'bg-orange-400 text-white',
  grey:    'bg-gray-400 text-white',
  red:     'bg-red-500 text-white',
}
```

#### Keyboard layout
Three rows, standard QWERTY:
```
Row 1: Q W E R T Y U I O P
Row 2:  A S D F G H J K L
Row 3:    Z X C V B N M ⌫
```

Render as three `<div className="flex gap-1 justify-center">` rows. Each letter key is a `<button type="button">` with `flex-1 min-w-0 py-3 rounded-lg font-bold text-sm uppercase select-none`. The backspace key uses `flex-[1.5]` and the `default` colour class.

Compute a `keyColors` map once per render:
```tsx
const keyColors = useMemo(() => {
  const map: Record<string, KeyColor> = {}
  'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').forEach(l => {
    map[l] = computeKeyColor(l, guesses, overrides)
  })
  return map
}, [guesses, overrides])
```

#### Container styling
```tsx
<div className="mt-3 w-full max-w-sm mx-auto space-y-1">
  {/* rows */}
  {hasConflict && (
    <p className="mt-2 text-center text-xs text-gray-500">
      Red key = conflicting tile colours for that letter
    </p>
  )}
</div>
```

`hasConflict` = `Object.values(keyColors).some(c => c === 'red')` — only show the note when at least one key is red.

#### Disabled state
When `disabled` is true, all buttons have `disabled` attribute and `opacity-50` class, and `pointer-events-none` on the container.

---

### Phase 4 — Wire up `PuzzlePanel`

**File:** `app/src/components/Puzzles/PuzzlePanel.tsx`

**Add state:**
```tsx
const [inputValue, setInputValue] = useState('')
const [currentOverrides, setCurrentOverrides] = useState<(TileOverride | null)[][]>([])
```

**Add keyboard input handlers:**
```tsx
function handleKeyboardLetter(letter: string) {
  setInputValue(prev =>
    prev.length >= CONFIG.wordLength ? prev : prev + letter
  )
}

function handleKeyboardBackspace() {
  setInputValue(prev => prev.slice(0, -1))
}
```

**Update GuessInput call** (in the active-puzzle render branch):
```tsx
<GuessInput
  value={inputValue}
  onValueChange={setInputValue}
  onSubmit={handleGuessSubmit}
  disabled={isSubmitting}
  ownWord={ownWord}
/>
```

**Reset inputValue on guess submit** — in `handleGuessSubmit`, after `setMyGuesses(...)`:
```tsx
setInputValue('')
```

**Update GuessList call:**
```tsx
<GuessList
  guesses={myGuesses}
  initialOverrides={savedOverrides ?? undefined}
  onSolveSnapshot={handleSolveSnapshot}
  onOverridesChange={setCurrentOverrides}
/>
```

**Add OnScreenKeyboard** (same condition as GuessInput — `!isSolved && targetWord && !isLoading`):
```tsx
<OnScreenKeyboard
  onLetterPress={handleKeyboardLetter}
  onBackspace={handleKeyboardBackspace}
  disabled={isSubmitting}
  guesses={myGuesses}
  overrides={currentOverrides}
/>
```

Place the keyboard directly after the `<GuessInput>` in the JSX (inside the `mt-4` div, after the GuessInput).

---

### Phase 5 — Wire up `PracticeView`

**File:** `app/src/components/Puzzles/PracticeView.tsx`

**Add state:**
```tsx
const [inputValue, setInputValue] = useState('')
```

**Add keyboard input handlers** (same as PuzzlePanel):
```tsx
function handleKeyboardLetter(letter: string) {
  setInputValue(prev =>
    prev.length >= CONFIG.wordLength ? prev : prev + letter
  )
}

function handleKeyboardBackspace() {
  setInputValue(prev => prev.slice(0, -1))
}
```

**Reset inputValue on submit** — in `handleGuessSubmit`:
```tsx
setInputValue('')
```

**Reset inputValue on new word** — in `handleNewWord`:
```tsx
setInputValue('')
```

**Update GuessInput call:**
```tsx
<GuessInput
  value={inputValue}
  onValueChange={setInputValue}
  onSubmit={handleGuessSubmit}
  disabled={false}
  ownWord={null}
/>
```

**Add OnScreenKeyboard** (same condition as GuessInput — `!isSolved`):
```tsx
<OnScreenKeyboard
  onLetterPress={handleKeyboardLetter}
  onBackspace={handleKeyboardBackspace}
  disabled={false}
  guesses={guesses}
  overrides={guesses.map(g => Array(g.word.length).fill(null))}
/>
```

In practice mode, all overrides are `null` so all keys will be default colour.

---

### Phase 6 — Bump version

**File:** `app/package.json`

Change `"version"` field from `"1.10.0"` to `"1.11.0"`.

---

### Phase 7 — Update specs

**File:** `specs/spec-game-design.md`
- Add a new section documenting the on-screen keyboard feature: what it shows, key colour rules, when it is visible (active puzzle only), conflict state, and the backspace button

**File:** `specs/spec-implementation.md`
- Add `OnScreenKeyboard` to the component inventory with a description of its props, key colour logic, and layout
- Note that `GuessInput` is now a controlled component (value/onValueChange props)
- Note that `GuessList` emits `onOverridesChange` for parent tracking

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. Manual: open `/play` — on-screen keyboard appears below guess input for each active panel
4. Manual: tap letters on keyboard — input field fills up, stops at 5 characters
5. Manual: tap ⌫ — removes last character from input
6. Manual: native keyboard still works when input is focused (click directly in the input box)
7. Manual: annotate a tile green for letter "A", then check that the "A" key on the keyboard turns green
8. Manual: annotate two "A" tiles to different colours — key should turn red; conflict note should appear below keyboard
9. Manual: annotate a tile and then tap all "A" -> same colour — key should update to that colour, note should disappear
10. Manual: after solving a puzzle — keyboard disappears along with the input
11. Manual: panel with "word not set yet" message — no keyboard visible
12. Manual: open `/practice` — keyboard appears, all keys default colour, works the same as the puzzle keyboard
13. Manual: tap "Play Again" in practice — keyboard resets, all keys default
14. Manual: on mobile width — keyboard fills the screen width
15. Manual: on desktop — keyboard is max ~384px wide (max-w-sm) centered

---

## Decisions & Scope

- **Controlled GuessInput:** Lifting value state to the parent is the cleanest React pattern and avoids `useImperativeHandle` complexity. The parent (PuzzlePanel / PracticeView) owns the typed value and feeds it to both GuessInput and OnScreenKeyboard.
- **Override tracking via callback:** Rather than fully lifting override state out of GuessList (a large refactor), GuessList keeps ownership of override state and notifies the parent via `onOverridesChange`. This is minimal-invasive and avoids threading new props through GuessRow.
- **No overrides in practice mode:** Practice mode has no tile annotation (`initialOverrides` is never passed), so all keyboard keys remain default colour. This is intentional — practice mode is simpler by design.
- **Red key logic:** A key turns red only if ALL tiles for that letter have been annotated AND they are not all the same colour. If any tile is still the default (null), the key stays default — the user hasn't made a decision on all instances yet, so there's no conflict to report.
- **Conflict note visibility:** The "Red key = conflicting tile colours" note is only shown when at least one key is currently red. Showing it unconditionally would clutter the UI needlessly.
- **Backspace key width:** `flex-[1.5]` gives it 50% more width than a letter key, consistent with standard virtual keyboards.
- **Max-width on desktop:** `max-w-sm` (384px) — wide enough for comfortable key tapping on a desktop, but not so wide that the keyboard looks gigantic in a narrow card.
- **Out of scope:** Haptic feedback, key-press animations, swipe gestures.
