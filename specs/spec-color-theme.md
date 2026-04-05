# Lengle — Color Theme Specification

This document defines the canonical color palette for the Lengle app. All UI components must use these colors. Do not introduce new color values without updating this spec.

---

## Palette

| Role | Tailwind class | Hex | Usage |
|---|---|---|---|
| **App background** | `bg-gray-50` | `#f9fafb` | Page background for all screens |
| **Card background** | `bg-white` | `#ffffff` | Panel bodies, leaderboard cards |
| **Card border** | `border-gray-200` | `#e5e7eb` | Card borders, dividers |
| **Nav / primary action** | `bg-gray-900` | `#111827` | Top navbar only |
| **Accent / secondary action** | `bg-violet-700` | `#6d28d9` | Puzzle panel accordion headers; "Play Today's Puzzles" CTA button; any future secondary-action buttons |
| **Correct tile (green)** | `bg-green-600` | `#16a34a` | Correct-position letter tiles in play screen and history |
| **Present tile (orange)** | `bg-orange-400` | `#fb923c` | Correct letter / wrong position mini squares |
| **Absent tile (grey)** | `bg-gray-200` | `#e5e7eb` | Letter not in word mini squares |
| **Incorrect guess tile** | `bg-gray-700` | `#374151` | Letter tiles for non-correct guesses |
| **Solved accent** | `text-green-600` | `#16a34a` | "Solved in N guesses" text, revealed word text |
| **Solved accent (on dark)** | `text-green-400` | `#4ade80` | Solved status text on violet-700 header backgrounds |
| **Winner accent bg** | `bg-amber-50` | `#fffbeb` | Winning row highlight in leaderboard |
| **Winner accent border** | `border-amber-200` | `#fde68a` | Winner banner border |
| **Winner accent text** | `text-amber-900` | `#78350f` | Winner banner text |
| **Error** | `text-red-600` | `#dc2626` | Inline validation errors |
| **Primary text** | `text-gray-900` | `#111827` | Body copy, headings |
| **Secondary text** | `text-gray-500` | `#6b7280` | Subtitles, labels, metadata |
| **Muted text** | `text-gray-400` | `#9ca3af` | Placeholder, chevrons, inactive hints |

---

## Responsive layout rules

- **Mobile (default)**: Puzzle panels are full-width, flush to screen edges. No rounded corners, no card shadow. `divide-y divide-gray-200` separates panels with a hairline.
- **Small screens and up (`sm:`)**: Puzzle panels become rounded cards (`sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm`) with `sm:space-y-4 sm:px-4` spacing from the screen edge.

## Button color rules

| Button type | Color | Examples |
|---|---|---|
| **Primary action / form submit** | `bg-gray-900 hover:bg-gray-800` | "Submit" in WordSetForm, "Go" guess submit button |
| **Secondary / navigation CTA** | `bg-violet-700 hover:bg-violet-800` | "Play Today's Puzzles" in Lobby |
| **Destructive / cancel** | Do not add without spec update | — |

The distinction: gray-900 is for actions that commit data (submitting a word or a guess). Violet-700 is for navigation/flow actions (entering the play screen).

---

## Page layout rules

- All screens except Play use `py-6` (or equivalent) top padding below the sticky header so heading text is not flush against the navbar.
- The Play screen puzzle container has **no vertical padding** (`py-6` is omitted). The accordion panel headers provide their own `py-4` internal padding, giving the panels a flush-to-header feel that maximises mobile screen space.

---

- **Violet-700 for accent/secondary actions**: Provides a clear secondary accent that distinguishes interactive puzzle headers and navigation CTAs from data-submission actions. Visually distinct from functional colors (green = correct, orange = present, red = error).
- **Gray-900 for nav and primary data actions**: A near-black that anchors the top navbar and data-submission buttons (WordSetForm, GuessInput). Not used for navigation or decorative surfaces.
- **No indigo**: Indigo was the original accent color from scaffolding. It has been fully replaced with the gray/violet scheme as of v1.2.
