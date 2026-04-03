# Lengle — Game Design Specification

> Version 1.1 — This document defines all game behaviour and user acceptance criteria. It is implementation-agnostic.

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

### 5.4 Per-Letter Score Display
- Alongside the total score for each guess, the individual score for each of the 5 letter positions is shown
- This allows players to see exactly which letters contributed to their score
- Example display: `CRANE → [0, 3, 1, 3, 0] = 7`

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
| Alex | 3 | 2 | **5** ✅ Winner |
| Mum | 4 | 3 | 7 |
| Dad | 2 | 6 | 8 |

---

## 7. Social Feed

### 7.1 Visibility Rule
- On any given puzzle, a player can see the guesses of other players **up to the number of guesses they themselves have made** on that same puzzle
- A player can always see the **total guess count** of all other players on any puzzle, regardless of their own progress
- Example: if Player A has made 3 guesses on Mum's puzzle, they can see the first 3 guesses (word + score) that the other player made on Mum's puzzle — but not their 4th or beyond

### 7.2 Post-Solve Visibility
- Once a player has solved a puzzle, their full guess history on that puzzle becomes visible to any other player who has **also solved the same puzzle**
- Players who have not yet solved the puzzle continue to see only up to their own guess count

### 7.3 Display
- Below each active puzzle panel is a collapsible **"Others"** section
- The section contains one collapsible sub-panel per other player, labelled with their name and current total guess count on that puzzle
- Expanding a sub-panel reveals their visible guesses: the guessed word, the per-letter scores, and the total score per guess
- All panels are collapsed by default

---

## 8. Screens & User Flows

### Screen 1 — Player Select
- Shown on every visit before any game content is displayed
- Contains a dropdown of the 3 player names
- The last used name is pre-selected
- A single "Play" button proceeds to the current day's lobby
- No other content or navigation is shown on this screen

---

### Screen 2 — Lobby / Word Setting

**State A — Player has not yet set today's word:**
- A prominent word entry field with a Submit button is shown
- Inline validation feedback appears on submission failure
- A status list shows all 3 players: ✅ Word set / ⏳ Pending

**State B — Player has set today's word, others still pending:**
- A message indicates who still needs to set their word: `"Waiting for [Name] to set their word…"`
- The status list is shown
- No guessing is available
- The lobby polls for updates so the player sees when others submit without refreshing

**State C — All 3 words are set:**
- A "Play Today's Puzzles" button is shown prominently
- The status list shows all 3 as ✅

**Tomorrow's word (always available):**
- A collapsible section at the bottom of the lobby: "Set Tomorrow's Word"
- Available as soon as today's puzzle has opened (after 4am)
- Same word validation rules apply
- Once submitted, the section shows a confirmation and the submitted word (read-only)
- This section is collapsed by default

---

### Screen 3 — Today's Puzzles

**Layout:**
- Two puzzle panels stacked vertically, full width
- A persistent header shows today's date and navigation links to the Leaderboard and Word History
- A navigation link back to the Lobby is available

**Each puzzle panel:**
- Labelled with the setter's name
- Shows the current player's full guess history: each row displays the guessed word, the per-letter scores, and the total score
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

Three tabs: **Today**, **All Time**, **Trends**

#### Today Tab
- Highlights the daily winner (or joint winners)
- A table showing each player's guess count per puzzle and their total daily score
- Per-puzzle winner indicated inline
- Updates as players complete puzzles throughout the day

#### All Time Tab
- Total daily wins per player (joint wins count for all tied players)
- 🏆 **Best Setter** — whose words required the most average guesses to solve across all time
- 🎯 **Sharpest Guesser** — lowest average guess count per puzzle across all time
- 🔥 **Longest Win Streak** — most consecutive daily wins ever recorded per player
- 📅 **Current Streak** — each player's active consecutive daily win streak

#### Trends Tab
- Line graph: each player's guess score per individual guess over time, showing convergence toward 0 (measures deduction speed improvement)
- Line graph: daily total guess count per player over time
- Bar chart: average guesses required per puzzle word across all history (shows which words were hardest)
- All graphs are filterable by player and date range

---

### Screen 5 — Word History

- Accessible from the main navigation
- Shows a reverse-chronological list of all past puzzle days
- Each day entry is expandable and shows:
  - The date
  - Each puzzle word and who set it
  - The daily winner
  - Each player's full guess breakdown for each puzzle: every guess made, the per-letter scores, the total score per guess, and how many guesses it took to solve
- Current day's words and guesses are **not** shown in Word History until the puzzle day has ended (i.e. after 4am the following day)
- Unsolved puzzles from past days show the word and the player's incomplete guess history with a "Not solved" label

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
| AC-09 | A player sees other players' guesses only up to their own guess count on that puzzle |
| AC-10 | A player always sees the total guess count of other players regardless of their own progress |
| AC-11 | Full guess history is mutually visible only to players who have both solved the same puzzle |
| AC-12 | The daily winner is the player with the lowest total guess count across both puzzles |
| AC-13 | Joint winners are supported at both puzzle and daily level |
| AC-14 | Today's puzzle words and guesses do not appear in Word History until the following day after 4am |
| AC-15 | The app never displays a timer anywhere |
| AC-16 | The daily reset occurs at 4am local device time |
| AC-17 | The last selected player name is remembered across visits |
| AC-18 | Per-letter scores are shown alongside the total score for every guess |
| AC-19 | The lobby status updates automatically without a manual page refresh |
| AC-20 | The first player to open the app after 4am triggers finalisation of the previous day's results if not already written |

---

## 10. Out of Scope (v1)

- Push notifications or email reminders
- More than 3 players
- Admin panel for managing words or players
- Ability to change a submitted puzzle word
- Dark mode
- Sound effects or animations
- In-app chat or messaging
