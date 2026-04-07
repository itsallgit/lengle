# Lengle — Game Design Specification

> Version 1.7 — This document defines all game behaviour and user acceptance criteria. It is implementation-agnostic.

---

## 1. Overview

Lengle is a private, daily multiplayer word puzzle game for exactly 3 players. Each player sets a secret 5-letter word for the other two players to guess. Guessing uses a numeric scoring mechanic to provide feedback. The player who solves both daily puzzles in the fewest total guesses wins the day. The game is relaxed, async, and pressure-free — no timers, no failure states.

---

## 2. Players

- The game supports exactly 3 players
- Player names are fixed and known to the app — they cannot be changed in-game
- On every visit, a player selects their name from a dropdown list
- No password or authentication is required
- The app remembers the last selected player across visits so the correct name is pre-selected on return
- A player can change their selected name at any time via the dropdown

---

## 3. Daily Cycle

### 3.1 Reset Time
- A new puzzle day begins at **4am local device time**
- All game state is associated with a calendar date derived from the local device clock, offset by 4 hours
  - At 3:59am on April 2nd, the active puzzle date is still April 1st
  - At 4:00am on April 2nd, the active puzzle date becomes April 2nd

### 3.2 Word Setting
- Each day, every player must submit one 5-letter puzzle word for the other two players to guess
- A player may set their word for the **next** day at any point after today's puzzle has opened (after 4am), without needing to complete today's puzzles first
- Once a word is submitted for a given day, it is locked — it cannot be viewed or changed by the submitting player before the puzzle day begins

### 3.3 Puzzle Unlock
- Guessing is locked for all players until all 3 players have submitted their word for the day
- While waiting, a lobby screen shows the submission status of all 3 players (name visible, ✅ submitted or ⏳ pending)
- The lobby status refreshes automatically so players see when others have submitted without needing to manually reload
- Once all 3 words are submitted, guessing unlocks for all players simultaneously
- There is no notification mechanism — players check the app in their own time

### 3.4 Day Transition
- When the clock passes 4am and a new puzzle date becomes active, the previous day's puzzle words become part of the historical record and are freely visible in Word History
- Any player who opens the app after the transition triggers the finalisation of the previous day's results if not already done

---

## 4. Word Rules

### 4.1 Puzzle Words (set by players)
- Must be exactly 5 letters
- Must be a real English word, validated against the app's bundled word list
- Must not have been used as a puzzle word on any previous day by any player
- Stored and validated case-insensitively; displayed in uppercase throughout the app
- If a submitted word fails validation, the player is shown a specific inline error and asked to try again:
  - `"Not a valid word — please try another"`
  - `"This word has already been used — please try another"`

### 4.2 Guess Words (entered by players)
- Must be exactly 5 letters
- Must be a real English word, validated against the app's bundled word list
- If a submitted guess fails validation, the player is shown an inline error and no guess is recorded:
  - `"Not a valid word — please try another"`
- The same guess word may be submitted more than once (though this would be a poor strategy)
- A player cannot guess their own puzzle word

### 4.3 Word List
- A single bundled English word list is used for both puzzle word validation and guess validation
- The word list is static and does not change at runtime
- The word list should contain common, recognisable English words — obscure or highly technical words should be excluded to keep the game accessible
- The word list must not include plural forms of shorter words — words that are simply the plural of a 4-letter or shorter root word (e.g. "plans", "words", "birds", "hands") are excluded. Words ending in 's' that are not plurals of a shorter base word remain valid (e.g. "grass", "dress", "cross", "chess", "focus").

---

## 5. Guessing Mechanic

### 5.1 Structure
- Each player solves exactly 2 puzzles per day: one set by each of the other two players
- Guesses are unlimited — there is no maximum and no failure state
- A puzzle is marked **solved** when a player submits a guess that scores 0

### 5.2 Numeric Scoring
Each guess produces a numeric score calculated independently across all 5 letter positions:

| Result | Points |
|---|---|
| Correct letter, correct position | +0 |
| Correct letter, wrong position | +1 |
| Letter not in word | +3 |

- **Minimum score:** 0 — the guess is correct and the puzzle is solved
- **Maximum score:** 15 — no letters are correct or present
- The score for each guess is displayed immediately and permanently in the player's guess history
- No colour coding is used anywhere — feedback is numeric only

### 5.3 Duplicate Letter Handling
- Each letter in the guess is scored independently against the target word
- If a letter appears once in the target but twice in the guess, one instance scores +0 or +1 and the other scores +3
- The +0 or +1 instance is awarded to the positionally correct occurrence first; remaining duplicates score +3

### 5.4 Score Display
- Each guess row displays two feedback elements:
  1. **Mini colour tiles** — displayed as 3 stacked rows (green row, then orange row, then grey row), each row containing as many small coloured squares as there are letters scoring in that category. A row is empty (and visually absent) if there are no letters in that category. This shows the **count** of green/orange/grey letters — NOT the per-position order. These 3 rows are grouped together and appear on the same main row as the guess word tiles.
  2. **Total numeric score** displayed in a de-emphasised secondary style (plain text, no coloured background). Hidden when the score is 0 (solved).
- Correct guesses (score = 0) show all 5 mini squares as green in the first row; the score value is not shown.
- **IMPORTANT — Lengle is NOT Wordle:** The mini tile indicators must never reveal which position each letter scored in. They only reveal the count of green/orange/grey letters. Showing position-specific information would give players too much information and is fundamentally against the game design.
- **Tile manual annotation:** Each guess tile (the large letter tile) can be tapped to cycle through override colours: default (dark blue-grey) → green → orange → grey → back to default. There is no "light grey" step.
- **Reset Tiles button:** A button is always visible spanning the full width of the guess tile area. When no tiles have manual overrides, the button is disabled and reads "Tap guess tiles to change colours" (greyed out). When any tile has a manual override, the button is enabled and reads "Tap to reset guess tiles".
- Example display: `CRANE` scores 2 green, 1 orange, 2 grey → shows 2 green squares (row 1), 1 orange square (row 2), 2 grey squares (row 3), plus `(7)`

---

## 6. Winning & Daily Score

### 6.1 Per-Puzzle Winner
- The winner of each individual puzzle is the player who solved it in the **fewest guesses**
- If two players solve a puzzle in the same number of guesses, both are credited as joint winners of that puzzle

### 6.2 Daily Winner
- Each player's **daily score** = total number of guesses taken across both of their puzzles
- The daily winner is the player with the **lowest daily score**
- If two or more players share the lowest daily score, all are credited as joint daily winners
- A player who has not yet solved both puzzles does not appear in the daily winner calculation until they complete both

### 6.3 Example
| Player | Guesses (Puzzle 1) | Guesses (Puzzle 2) | Daily Score |
|---|---|---|---|
| Troy | 3 | 2 | **5** ✅ Winner |
| Mum | 4 | 3 | 7 |
| Dad | 2 | 6 | 8 |

---

## 7. Social Feed

### 7.1 Visibility Rule
- Other players' actual guess words are **never visible** to any player
- A player can always see the **total guess count** and **solved status** of all other players on any puzzle

### 7.2 Display
- Below each active puzzle panel is a collapsible **"Others"** section
- The section contains one row per other player showing: emoji, name, guess count, and a solved indicator (✓) if they have solved the puzzle
- Example: `🌸 Mum — 3 guesses ✓`
- No guess words or scores are shown under any circumstances
- All panels are collapsed by default

---

## 8. Screens & User Flows

### Navigation Bar
- A persistent navigation bar is shown on all authenticated screens (all screens except Player Select)
- When the player is on the **Home page**, the nav bar title displays **"LENGLE"** rendered as individual green letter tiles (matching the visual style of the Play Selection screen — each letter in a coloured square tile)
- On all other pages, the nav bar shows the name of the current page
- Nav links: **Home**, **Play**, **Practice**, **Leaderboard**, **History**

---

### Screen 1 — Player Select
- Shown on every visit before any game content is displayed
- Contains a dropdown of the 3 player names
- The last used name is pre-selected
- A single "Play" button proceeds to the current day's lobby
- No other content or navigation is shown on this screen

---

### Screen 2 — Home (formerly Lobby)

**Layout:**
- Greeting with the player's current emoji and name; **tapping the emoji in the greeting opens the in-page emoji picker** (no separate emoji button in the top-right — the emoji itself is the trigger)
- No "Home" subtitle text under the welcome greeting
- In-page emoji picker (expandable section showing ~80 preset emojis; selecting one updates immediately)
- Word submission status table for today and tomorrow (all 3 players, ✅ / ⏳ for each date)
- CTA cards section (see states below) — all CTA buttons span the full width of their container
- Version number at bottom centre (`vX.Y.Z`)
- "Playing as [Name] — change player" link at the very bottom

**State A — Player has not yet set today's word:**
- CTA 1: "Set Today's Word" — word entry form inline (expanded)
- CTA 2: "Today's Puzzles" — greyed-out card (disabled, games not unlocked yet)
- CTA 3: "Play Practice Puzzle" — violet CTA button, always available

**State B — Player has set today's word, others still pending:**
- CTA 1: "Set Tomorrow's Word" form if tomorrow's word not yet set; "✅ Words set for today and tomorrow" text if both words are set
- CTA 2: "Today's Puzzles" — greyed-out card with waiting message "Waiting for [Name] to set their word…"
- CTA 3: "Play Practice Puzzle" — always shown
- The home page polls for updates so the player sees when others submit without refreshing

**State C — All 3 words are set:**
- CTA 1: "Set Tomorrow's Word" form if needed; confirmation text if both set
- CTA 2: "Today's Puzzles" — violet CTA button to `/play`
- CTA 3: "Play Practice Puzzle" — always shown

**Word submission status table:**
- Header columns: Player | TODAY (date) | TOMORROW (date)
- One row per player showing ✅ (set) or ⏳ (pending) for both dates

**Tomorrow's word (available in all states):**
- Shown via CTA 1 once today's word is set and tomorrow's word is not yet set
- Same word validation rules apply
- Once submitted, CTA 1 shows "✅ Words set for today and tomorrow"

---

### Screen 2b — Practice Puzzle

- Accessible via the new `/practice` route from the Home page
- Picks a random word from the bundled word list as the target
- Fully client-side — no S3 reads or writes; no scores are saved
- Gameplay is identical to a regular puzzle: guess 5-letter words, see numeric scores and count-based colour tile indicators
- No restriction on guessing own word (no setter identity in practice mode)
- When solved: shows "Solved in N guesses 🎉", reveals the target word, and offers a "Play Again" button (picks a new random word)
- The session is discarded when the player navigates away

---

### Screen 3 — Today's Puzzles

**Layout:**
- Two puzzle panels stacked vertically, full width
- A persistent header shows today's date and navigation links to the Leaderboard and Word History
- A navigation link back to the Lobby is available

**Each puzzle panel:**
- Labelled with the setter's name
- Shows the current player's full guess history: each row displays the guessed word and the total score
- A text input + Submit button for entering the next guess (hidden once solved)
- A `"Solved in N guesses 🎉"` banner replaces the input when the puzzle is solved
- A collapsible "Others" section below (per Section 7)

**Input behaviour:**
- Accepts alpha characters only, auto-uppercased
- Limited to exactly 5 characters
- Submit is disabled until exactly 5 characters are entered
- On invalid submission, an inline error is shown and no guess is recorded
- On valid submission, the guess row and score are appended to the history immediately

---

### Screen 4 — Leaderboard & Metrics

Two tabs: **Today**, **All Time** (Trends tab removed)

#### Today Tab
- **Daily Scores** section at the top: each player's total guess count. Shows a grey `?` tile instead of a number for any player who has not yet completed all 2 daily puzzles.
- **Winner section**: only shown when **all players have completed all daily puzzles**. Until then, a message reads "Not all players have completed today's puzzles" in place of the winner announcement.
- **Per-puzzle sections** below: one card per setter. Each card shows:
  - Word tile reveal: if all non-setter players have solved the puzzle, shows the actual word as green tiles. Otherwise shows 5 grey `?` tiles.
  - Guesser table: guess count per player (grey `?` tile for unsolved), trophy for puzzle winner.
- Updates as players complete puzzles throughout the day
- Unsolved/unknown player counts use a grey `?` tile (styled as a game tile), not the red ❓ emoji

#### All Time Tab
- **Hero stat**: large number showing completed puzzle days (days where all 3 players solved all puzzles)
- Explanation text below has generous horizontal padding on left and right
- **Total Scores leaderboard** (sorted by score ascending — lowest wins):
  - Each player's total guesser score across completed days
  - Winner highlighted in amber
  - Note: "Lowest score wins"
- **Per-player stats table**: displayed as a table with column headers — no repeated section headers per player:
  - Column headers: **Player** | **Guesses to Solve** (in orange, matching game colour) | **Guesses from Others** (in green, matching game colour)
  - One row per player with their name/emoji in column 0, their guesser score in column 1, and their word setter score in column 2

**All Time scoring model:**
- A **completed day** = a day where every player solved every other player's puzzle (`is_correct === true` for all 6 combinations)
- **Guesser score** = total guesses a player made on all other players' puzzles (completed days only)
- **Word setter score** = total guesses other players made on a player's puzzle words (completed days only)
- Overall winner = player(s) with lowest guesser score

---

### Screen 5 — Word History

- Accessible from the main navigation
- Shows a reverse-chronological **accordion list** of all past puzzle days
- **Accordion header** for each day shows:
  - The date
  - A completion indicator (e.g. checkmark) if all daily puzzles were completed by all players that day
- **Expanded accordion** for a day is divided into **3 sections** — one per puzzle setter:
  - **Puzzle word display**: shown as green letter tiles if all players finished that puzzle; shown as 5 grey `?` tiles if not all players finished
  - **Setter identity**: the setter's player name and emoji displayed next to the puzzle word
  - **Guess counts**: one row per non-setter player showing their total guess count for that puzzle. If a player did not complete the puzzle, shows a grey `?` tile instead of a number
- Current day's words and guesses are **not** shown in Word History until the puzzle day has ended (i.e. after 4am the following day)

---

## 9. Acceptance Criteria Summary

| # | Criterion |
|---|---|
| AC-01 | A player cannot guess their own puzzle word |
| AC-02 | A puzzle word that fails dictionary validation is rejected with a specific error |
| AC-03 | A puzzle word that has been used on a previous day is rejected with a specific error |
| AC-04 | A guess that fails dictionary validation is rejected and no guess is recorded |
| AC-05 | Guessing is locked until all 3 players have submitted a word for the day |
| AC-06 | A player can set tomorrow's word at any time after today's puzzle opens |
| AC-07 | A submitted word cannot be changed |
| AC-08 | A score of 0 marks a puzzle as solved and removes the input field |
| AC-09 | ~~A player sees other players' guesses only up to their own guess count on that puzzle~~ *(removed — other players' guess words are never visible)* |
| AC-10 | A player always sees the total guess count and solved status of other players regardless of their own progress |
| AC-11 | ~~Full guess history is mutually visible only to players who have both solved the same puzzle~~ *(removed — other players' guess words are never shown)* |
| AC-12 | The daily winner is the player with the lowest total guess count across both puzzles |
| AC-13 | Joint winners are supported at both puzzle and daily level |
| AC-14 | Today's puzzle words and guesses do not appear in Word History until the following day after 4am |
| AC-15 | The app never displays a timer anywhere |
| AC-16 | The daily reset occurs at 4am local device time |
| AC-17 | The last selected player name is remembered across visits |
| AC-18 | Each guess shows mini colour tile indicators (count-based, displayed as 3 stacked rows: green / orange / grey) plus a de-emphasised total score; correct guesses show all-green indicators with no score value; mini tiles never reveal per-position information |
| AC-19 | The lobby status updates automatically without a manual page refresh |
| AC-20 | The first player to open the app after 4am triggers finalisation of the previous day's results if not already written |

---

## 10. On-Screen Keyboard

- The **on-screen keyboard** is displayed below the guess input field on the puzzle screen and the practice screen
- It consists of a standard QWERTY letter layout (3 rows) plus a ⌫ backspace key in the bottom-right corner
- Tapping a letter key appends that letter to the current guess input, up to the 5-letter maximum
- Tapping ⌫ removes the last letter from the current guess input
- The native device keyboard remains usable at any time by tapping directly into the guess input field
- The on-screen keyboard is only shown when the puzzle is **active** — i.e. the puzzle word has been set and the player has not yet solved it. It is hidden when the puzzle is solved, when the word has not yet been set, or while the puzzle is loading

### 10.1 Key Colour Rules

Each letter key reflects the player's current tile override annotations for that letter across all current guesses:

| Condition | Key colour |
|---|---|
| No guesses contain that letter | Default (grey) |
| All tiles for that letter are in the default state (no annotation) | Default (grey) |
| All annotated tiles for that letter have the same colour (green / orange / grey), and at least one tile is still default | Default (grey) |
| All tiles for that letter are annotated and all are the same colour | That colour (green / orange / grey) |
| All tiles for that letter are annotated but they are not all the same colour | **Red** (conflict) |

In other words: a key only turns a specific colour when **every** occurrence of that letter across all guesses has been annotated with the **same** colour. If any tile is still in the default state, the key stays default.

### 10.2 Conflict Indicator

- If any key is shown in red (conflicting annotations), a short explanatory note appears directly below the keyboard: *"Red key = conflicting tile colours for that letter"*
- The note is only shown when at least one key is currently red; it hides when all conflicts are resolved

### 10.3 Practice Mode

- The on-screen keyboard is also shown in practice mode
- Practice mode does not support tile annotation, so all keys remain in the default colour

---

## 11. Player Emoji

- Each player can select a custom emoji to represent them throughout the app
- A grid of ~80 preset emojis is available on **both** the Player Select screen and the Home page (in-page emoji picker)
- The selected emoji is displayed alongside the player's name in all views (leaderboard, lobby, puzzle panels, word history)
- Emoji preferences are stored in S3 at `data/players/profiles.json` and are shared across all devices
- Each player has a `defaultEmoji` defined in config, which is used if no custom emoji has been saved
- Emoji changes take effect immediately in the UI and are persisted to S3 in the background
- The expanded preset list (~80 emojis) is defined in `PRESET_EMOJIS` in `config.ts` and includes animals, nature, food, activities, and misc

---

## 12. Out of Scope (v1)

- Push notifications or email reminders
- More than 3 players
- Admin panel for managing words or players
- Ability to change a submitted puzzle word
- Dark mode
- Sound effects or animations
- In-app chat or messaging
