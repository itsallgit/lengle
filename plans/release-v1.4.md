# Release v1.4 — PlayerSelect polish, Lobby greeting, and README update

## Overview

| Field | Value |
|---|---|
| Release | v1.4 |
| Branch | release/v1.4 |
| Date | 2026-04-05 |
| Status | Done |

### Summary
Small UX polish pass focused on the PlayerSelect and Lobby screens, plus a README rewrite. The Lengle title becomes a row of letter tiles, the Play button and dropdown get colour/spacing fixes, and the Lobby greets the player by name. The README is rewritten to be clearly readable by non-developers, covering what the game is and how to make updates with the AI agents.

### Changes included
- **PlayerSelect — Lengle title as tiles** — Replace plain `<h1>Lengle</h1>` with a row of five green letter tiles spelling L-E-N-G-L-E (six tiles, one per letter)
- **PlayerSelect — Play button → violet-700** — Match the secondary CTA color from the color scheme spec
- **PlayerSelect — dropdown arrow padding** — The native `<select>` arrow is too close to the right border; add `pr-10` to give it breathing room
- **Lobby — personal greeting** — Replace "Today's Lobby" heading with "Hi, {name}!" so each player immediately sees who they're logged in as
- **README rewrite** — Simplified, human-friendly README covering: what the game is, how to play, and how to make changes using the release and build agents

---

## Implementation Plan

### Phase 1 — PlayerSelect changes (`app/src/components/PlayerSelect/PlayerSelect.tsx`)

**Step 1.1 — Tile title**

Replace:
```tsx
<h1 className="text-4xl font-black tracking-tight text-gray-900">
  Lengle
</h1>
<p className="mt-1 text-sm text-gray-500">Daily word puzzle</p>
```

With a row of `bg-green-600` tiles and the tagline below:
```tsx
<div className="flex justify-center gap-1.5">
  {'LENGLE'.split('').map((letter, i) => (
    <div
      key={i}
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-lg font-bold text-white"
    >
      {letter}
    </div>
  ))}
</div>
<p className="mt-3 text-sm text-gray-500">Daily word puzzle</p>
```

**Step 1.2 — Dropdown padding fix**

Change the `<select>` className:
- Add `pr-10` to create space between the text and the native dropdown arrow
- Current: `className="w-full rounded-xl border-2 border-gray-200 px-3 py-3 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"`
- Updated: `className="w-full rounded-xl border-2 border-gray-200 py-3 pl-3 pr-10 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"`

**Step 1.3 — Play button color**

Change the Play button from `bg-gray-900 hover:bg-gray-800 focus:ring-gray-700` to `bg-violet-700 hover:bg-violet-800 focus:ring-violet-600`.

### Phase 2 — Lobby greeting (`app/src/components/Lobby/Lobby.tsx`)

**Step 2.1 — Personalised heading**

The current heading is:
```tsx
<h1 className="text-xl font-bold text-gray-900">
  Today&rsquo;s Lobby
  {loading && (
    <span className="ml-2 text-sm font-normal text-gray-400">
      Loading…
    </span>
  )}
</h1>
```

Replace with a greeting that uses `currentPlayerName` (already computed just above this block):
```tsx
<div>
  <h1 className="text-2xl font-bold text-gray-900">
    Hi, {currentPlayerName}!
  </h1>
  <p className="mt-0.5 text-sm text-gray-500">
    {loading ? 'Loading…' : "Today's puzzle lobby"}
  </p>
</div>
```

### Phase 3 — README rewrite (`README.md`)

Rewrite the full README to be simple and readable. Target audience: family members who might want to understand what the app is, and Troy who needs to know how to maintain it with AI agents.

Structure:
1. **What is Lengle?** — 3–4 sentence description of the game
2. **How to play** — brief numbered steps
3. **Making changes** — how to use `@release-agent` and `@build-agent` to update the game
4. **Repository structure** — table of key files (keep it, trim to essentials)
5. **Local dev setup** — kept brief for reference

## Verification

1. `cd app && npm run typecheck` — zero errors
2. `cd app && npm run lint` — zero errors
3. PlayerSelect: "LENGLE" rendered as six green tiles at the top of the card
4. PlayerSelect: dropdown arrow has clear space from the right border
5. PlayerSelect: "Play" button is violet-700
6. Lobby: greeting shows "Hi, Troy!" (or the relevant player name)
7. README: readable and accurate

## Decisions & Scope

- **Six tiles for "LENGLE"**: The word is 6 letters. Tiles render at `h-10 w-10` (smaller than the play screen's `h-12 w-12`) so they fit the narrow card without overflow on small phones.
- **Greeting replaces heading, not augments it**: "Hi, Troy! / Today's puzzle lobby" replaces "Today's Lobby" entirely — cleaner and gives the player more confidence they're logged in correctly.
- **README audience**: Keep it accessible for non-developers. The detailed architecture rationale stays in `specs/spec-implementation.md` — the README just points there.
