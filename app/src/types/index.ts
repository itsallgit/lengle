export interface Player {
  id: string
  name: string
}

export interface PuzzleWord {
  date: string
  setter_id: string
  word: string
  submitted_at: string
}

export interface DayStatus {
  date: string
  words_set: Record<string, boolean>
  unlocked: boolean
}

export interface GuessEntry {
  puzzle_setter_id: string
  guess_number: number
  word: string
  per_letter_scores: number[]
  score: number
  is_correct: boolean
  submitted_at: string
}

export interface PlayerGuesses {
  date: string
  guesser_id: string
  guesses: GuessEntry[]
}

export interface PuzzleWinner {
  setter_id: string
  winner_ids: string[]
  winning_guess_count: number
}

export interface PlayerResult {
  player_id: string
  total_guesses: number
  puzzles_solved: number
  is_daily_winner: boolean
}

export interface DayResults {
  date: string
  finalised_at: string
  player_results: PlayerResult[]
  puzzle_winners: PuzzleWinner[]
}
