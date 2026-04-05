# Release v1.6 — Guess row layout fix and light grey tile annotation

## Overview

| Field | Value |
|---|---|
| Release | v1.6 |
| Branch | release/v1.6 |
| Date | 2026-04-05 |
| Status | In Progress |

### Summary
Two small fixes to the v1.5 features. The guess row layout is restructured to eliminate horizontal overflow on mobile by moving the mini score squares below the tile row, and the container padding is reduced to bring row numbers close to the left edge with symmetric spacing. The tile colour cycling gains the missing light grey option to complete the intended annotation set.

### Changes included
- **Guess row layout fix** — Move mini score squares to appear below the tile row (instead of to the right). Reduces container padding from `px-5` to `px-3`. Row number width reduced from `w-5` to `w-4`. Eliminates overflow on all realistic mobile screen widths.
- **Light grey tile annotation** — Add `lightgrey` (`bg-gray-200 text-gray-800`) to the tile colour cycle so users can annotate tiles that they believe are not in the word, matching the "not in word" mini square colour. Full cycle: default → green → orange → light grey → default.

---

## Implementation Plan

Both changes are in `GuessRow.tsx` only (plus one-line padding fix in `PuzzlePanel.tsx`).

### Phase 1 — Padding fix (`PuzzlePanel.tsx`)

**Step 1.1 — `app/src/components/Puzzles/PuzzlePanel.tsx`**

Change `px-5` to `px-3` on the expanded content div:

```tsx
<div className="px-3 pt-4 pb-4">
```

This gives 12px symmetric padding on mobile, bringing row numbers close to the left edge.

---

### Phase 2 — GuessRow layout restructure + light grey (`GuessRow.tsx`)

Both changes are made together in a single rewrite of `GuessRow.tsx`.

**Step 2.1 — Move mini squares below tiles**

Replace the current flat `flex items-center gap-2` row (number + tiles + mini squares side by side) with a `flex flex-col gap-1` outer container. The tiles row stays as `flex items-center gap-2`. The mini squares move to a second row with `ml-6` indent (= `w-4` row number + `gap-2` = 16px + 8px = 24px, aligning dots under the first tile).

New structure:
```tsx
<div className="flex flex-col gap-1">
  <div className="flex items-center gap-2">
    <span className="w-4 shrink-0 text-right text-xs text-gray-400">{rowNumber}</span>
    <div className="flex gap-1.5">
      {/* tiles */}
    </div>
  </div>
  <div className="ml-6 flex gap-1">
    {/* score dot groups (green, orange, grey) — same content, now in one inline row */}
  </div>
</div>
```

The score dot row groups are now inline (same `flex gap-0.5` groups but in a single `flex gap-1` row rather than a `flex-col`), so they read as: `●● ●●● ●` (greens, then oranges, then greys).

**Step 2.2 — Add light grey to tile colour cycling**

- Rename `COLOR_CLASS` to `OVERRIDE_CLASS` and make it a record of `{ bg: string; text: string }` to support distinct text colours per override.
- Add `'lightgrey'` as a type variant: `bg-gray-200 text-gray-800` (light background, dark text — visible and matches the "not in word" mini square colour).
- Remove `text-white` from `tileBase` — text colour is now applied as part of `tileColor` dynamically.
- Update the cycle: `['green', 'orange', 'lightgrey', null]`

```tsx
type TileOverride = 'green' | 'orange' | 'lightgrey' | null

const CYCLE: TileOverride[] = ['green', 'orange', 'lightgrey', null]

const OVERRIDE_CLASS: Record<'green' | 'orange' | 'lightgrey', { bg: string; text: string }> = {
  green: { bg: 'bg-green-600', text: 'text-white' },
  orange: { bg: 'bg-orange-400', text: 'text-white' },
  lightgrey: { bg: 'bg-gray-200', text: 'text-gray-800' },
}

// In tile rendering:
const override = overrides[i]
const tileColor =
  override !== null
    ? `${OVERRIDE_CLASS[override].bg} ${OVERRIDE_CLASS[override].text}`
    : isCorrect
    ? 'bg-green-600 text-white'
    : 'bg-gray-700 text-white'

// tileBase no longer includes text-white:
const tileBase = 'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold animate-tile-pop'
```

---

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. Manual: Open play view on mobile (or narrow browser) — row numbers are close to the left edge, mini squares appear below the tiles, nothing overflows on the right
4. Manual: Left and right edge spacing looks symmetric
5. Manual: Click a tile on a wrong-guess row — cycle is now default (dark) → green → orange → light grey → default. The light grey tile shows the letter in dark text.

## Decisions & Scope

- **Mini squares below tiles** is a layout change but preserves all the same information (counts of green/orange/grey). The score dots are now in a single horizontal row (`flex gap-1`) with the colour groups still separated by the larger `gap-1` spacing.
- **`ml-6` = 24px** aligns the score dots under the first tile letter (row number `w-4` = 16px + `gap-2` = 8px = 24px). This is a Tailwind fixed value; if tile gap ever changes this indent may need updating.
- The previous `'grey'` override (`bg-gray-700`) is renamed/replaced by `'lightgrey'` (`bg-gray-200`). There is no separate "dark grey" override — the default unresolved tile colour serves that purpose when the cycle returns to `null`.
