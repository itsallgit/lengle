# Lengle — UX Design Specification

> Version 1.11 — This document defines the visual design principles, color palette, layout rules, and component styling conventions for the Lengle app. It is the source of truth for how the app looks and feels. Game rules and behaviour are defined separately in `spec-game-design.md`.

---

## 1. Design Philosophy

Lengle is a casual, relaxed family game. The design should feel:
- **Clean and readable** — no visual noise, generous whitespace, easy to scan
- **Calm, not competitive** — no countdown timers, no urgent red states (except error feedback)
- **Consistent** — the same element always looks and behaves the same way across all screens
- **Mobile-first** — the primary usage context is a phone; desktop is a bonus

---

## 2. Color Palette

| Role | Tailwind class | Hex | Usage |
|---|---|---|---|
| **App background** | `bg-gray-50` | `#f9fafb` | Page background for all screens |
| **Card background** | `bg-white` | `#ffffff` | Panel bodies, section cards |
| **Card border** | `border-gray-200` | `#e5e7eb` | Card borders, table dividers |
| **Nav bar** | `bg-gray-900` | `#111827` | Top navbar only |
| **Accent / CTA** | `bg-violet-700` | `#6d28d9` | Navigation CTA buttons, puzzle panel headers |
| **Correct tile** | `bg-green-600` | `#16a34a` | Correct-position letter tiles; solved state accents |
| **Present tile** | `bg-orange-400` | `#fb923c` | Correct letter / wrong-position tiles |
| **Absent tile** | `bg-gray-400` | `#9ca3af` | Letter annotated as not in word |
| **Default guess tile** | `bg-gray-700` | `#374151` | Non-annotated letter tiles in active guesses |
| **Solved accent text** | `text-green-600` | `#16a34a` | "Solved in N guesses" text on white backgrounds |
| **Solved accent (on dark)** | `text-green-400` | `#4ade80` | Solved status text on violet-700 panel headers |
| **Winner highlight bg** | `bg-amber-50` | `#fffbeb` | Winning row highlight in leaderboard |
| **Winner highlight border** | `border-amber-200` | `#fde68a` | Winner row border |
| **Winner highlight text** | `text-amber-900` | `#78350f` | Winner row text |
| **Error** | `text-red-600` | `#dc2626` | Inline form validation errors |
| **Conflict indicator** | `bg-red-500` | `#ef4444` | On-screen keyboard key with conflicting tile annotations |
| **Primary text** | `text-gray-900` | `#111827` | Body copy, headings |
| **Secondary text** | `text-gray-500` | `#6b7280` | Subtitles, labels, hints |
| **Muted text** | `text-gray-400` | `#9ca3af` | Placeholders, chevrons, disabled hints |

**Rules:**
- Do not introduce new color values without updating this table.
- Do not use indigo — it was the original scaffold accent and has been fully replaced by violet.

---

## 3. Buttons

Buttons are one of the most frequently repeated elements. Their appearance must be strictly consistent.

### 3.1 Button types

| Type | Color | Shape | Width | Usage |
|---|---|---|---|---|
| **Primary CTA** | `bg-violet-700 hover:bg-violet-800` | `rounded-xl` | Full width (`w-full`) | Top-level navigation and flow actions |
| **Form submit** | `bg-gray-900 hover:bg-gray-800` | `rounded-xl` | Shrink-to-content (`shrink-0`) | Submitting data: words, guesses |
| **Secondary / utility** | `bg-gray-200 hover:bg-gray-300` | `rounded-lg` | Full width | Reset, clear, minor actions |
| **Destructive** | Do not add without spec update | — | — | — |

### 3.2 Primary CTA buttons (violet-700)

These are the main call-to-action buttons on a screen — they drive the player's next step in the game flow:
- "Play Today's Puzzles"
- "Play Practice Puzzle"
- "View Scores" / "View Word History"
- "Play Again" (practice mode)

**Rules:**
- Always **full width** (`w-full`) — they span the full card or content width
- Use `rounded-xl` corners
- Padding: `px-6 py-3`
- Text: `text-sm font-semibold text-white`
- Full class: `w-full rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800`

### 3.3 Form submit buttons (gray-900)

These commit data — submitting a word or submitting a guess:
- "Submit" (word form)
- "Go" (guess input)

**Rules:**
- Shrink-to-content, not full width — they sit **inline** next to their input field
- Disabled state: `disabled:opacity-40`
- Full class for guess submit: `shrink-0 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 disabled:opacity-40`

### 3.4 Secondary / utility buttons

Used for non-destructive helper actions like resetting tile colours:
- "Tap here to reset tiles" / hint text when no overrides yet

### 3.5 Back / navigation buttons

Used to return to a previous page. Always rendered at the top of the page content, above all cards.

**Rules:**
- Shrink-to-content (do not use `w-full`)
- Visually styled as a bordered pill so it reads unambiguously as a button
- Full class: `flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50`
- Label: `← Back`
- Always uses `navigate(-1)` to return to the previous page in browser history

**Rules:**
- Full width within their container
- `rounded-lg` (smaller radius than CTA buttons — visually less prominent)
- Smaller text (`text-xs`) and less padding (`py-1.5`)
- Enabled: `bg-gray-200 hover:bg-gray-300 border border-gray-300 text-gray-700`
- Disabled / hint state: `bg-gray-100 border border-gray-200 text-gray-400 cursor-default`

---

## 4. Cards and Sections

All content sections on non-Play screens are presented as **white cards** on the `bg-gray-50` page background:

```
rounded-xl border border-gray-200 bg-white p-6 shadow-sm
```

**Rules:**
- Cards use `p-6` internal padding
- Section heading inside a card: `text-base font-bold text-gray-900`
- Sub-headings: `text-sm font-bold text-gray-900`
- Supporting description under a heading: `text-xs text-gray-500 mt-1`
- Spacing between cards: `space-y-6` on the page `<main>` container

---

## 5. Layout

### 5.1 Page container

All screens (except Play) use a centred, max-width container:
```
<main className="mx-auto max-w-lg space-y-6 px-4 py-8">
```

- `max-w-lg` (512px) — comfortable reading width on desktop
- `px-4` horizontal padding on mobile
- `py-8` top/bottom padding below the sticky header
- `space-y-6` between top-level sections

### 5.2 Play screen exception

The Play screen (`/play`) has no vertical padding and no max-width container. Puzzle panels span full width on mobile and become rounded cards at the `sm:` breakpoint. This maximises screen real estate on mobile.

- Mobile: panels are full-width, flush edges, `divide-y divide-gray-200` between them
- `sm:` and above: `sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm` with `sm:space-y-4 sm:px-4`

### 5.3 Responsive breakpoints

The app is designed mobile-first. The only breakpoint used is `sm:` (640px). Do not introduce `md:`, `lg:`, or larger breakpoints.

---

## 6. Typography

| Element | Classes |
|---|---|
| Page heading (`h1`) | `text-2xl font-bold text-gray-900` |
| Section heading (`h2`) | `text-base font-bold text-gray-900` |
| Sub-heading | `text-sm font-bold text-gray-900` |
| Body / description | `text-sm text-gray-500` |
| Small labels / hints | `text-xs text-gray-500` |
| Muted / inactive | `text-xs text-gray-400` |
| Monospace reveal (puzzle word) | `font-mono tracking-widest` |

---

## 7. Solved and Success States

When a player solves a puzzle or completes a flow step, success is shown with a **green banner**:

```
rounded-xl border border-green-200 bg-green-50 p-4
```

Contents order:
1. Success message: `text-sm font-medium text-green-800`
2. Optional supporting detail (e.g. guess count)
3. Follow-up action button — **always last**, always full-width violet-700 primary CTA

**Do not reveal the target word** to the player. Practice mode does not show the word on solve; the play screen shows it only within the solved panel header.

---

## 8. Info and Warning Banners

Non-interactive informational notes use soft-tinted inline banners:

| Purpose | Style |
|---|---|
| Info / neutral | `bg-blue-50 border border-blue-200 text-blue-800` — e.g. "Practice mode — guesses not saved" |
| Warning / pending | `bg-amber-50 border border-amber-200 text-amber-800` — e.g. "This puzzle word hasn't been set yet" |
| Error | `text-red-600 text-sm font-medium` inline below the triggering input |

Info and warning banners use `rounded-lg px-4 py-3 text-sm`.

---

## 9. On-Screen Keyboard

The on-screen keyboard uses the same color language as the guess tiles:

| Key state | Background | Text | Meaning |
|---|---|---|---|
| Default | `bg-gray-700` | `text-white` | No annotation — matches unannotated guess tile |
| Green | `bg-green-600` | `text-white` | Most recent guess: all instances of this letter annotated green |
| Orange | `bg-orange-400` | `text-white` | Most recent guess: all instances annotated orange |
| Grey | `bg-gray-400` | `text-white` | Most recent guess: all instances annotated grey |
| Red (conflict) | `bg-red-500` | `text-white` | Most recent guess has conflicting annotations for this letter |

**Rules:**
- Letter keys: `flex-1` equal width within each row
- Backspace key: `flex-[1.5]`, same default color as letter keys
- Maximum width: `max-w-sm` (384px), horizontally centred
- Only shown when the puzzle is active (not solved, not awaiting word set, not loading)
- A note "Red key = conflicting tile colours for that letter" is shown below the keyboard only when at least one key is red

---

## 10. Tile Annotation (Guess Rows)

Tiles are interactive — tap to cycle through annotations. Long-press (500ms) applies the color to all instances of that letter.

| State | Class | Meaning |
|---|---|---|
| Default — unsolved | `bg-gray-700` | No annotation |
| Default — correct guess | `bg-green-600` | Auto-applied on correct guess |
| Green | `bg-green-600` | Manually: correct position |
| Orange | `bg-orange-400` | Manually: wrong position |
| Grey | `bg-gray-400` | Manually: not in word |

Cycle order: Green → Orange → Grey → Default (null)

The **reset tiles button** appears **above** the guess list (not below). It shows in its hint/disabled state before any overrides are set, and becomes active once any tile is annotated. It is hidden once the puzzle is solved.

---

## 11. Navigation Bar

The persistent top navbar (`bg-gray-900`) contains:
- **Left**: Back/Home icon button (`text-white`)
- **Centre**: Page label in white, or animated LENGLE letter tiles on the home screen
- **Right**: Player emoji selector

The navbar is fixed to the top of the screen on all pages.

---

## 12. Design Change Process

Before making any visual change that affects multiple components (colors, button styles, spacing, typography), update this spec first. This prevents inconsistency from accumulating.

Changes that require a spec update:
- Adding a new button type or color variant
- Changing card padding, corner radius, or shadow
- Adding a new banner or alert style
- Changing tile annotation or keyboard key colors
