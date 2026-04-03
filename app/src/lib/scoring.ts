import { CONFIG } from './config'

export type LetterScore = 0 | 1 | 3

export interface GuessResult {
  perLetter: LetterScore[]
  total: number
  isCorrect: boolean
}

/**
 * Scores a 5-letter guess against a 5-letter target.
 *
 * Scoring values come from CONFIG.scoring (never hardcoded):
 *   correctPosition (+0): correct letter, correct position
 *   correctLetter   (+1): correct letter, wrong position
 *   notInWord       (+3): letter not present in word
 *
 * Duplicate letter handling:
 *   First pass awards correctPosition to exact matches, consuming that target slot.
 *   Second pass awards correctLetter to remaining unmatched guess letters that
 *   appear in a remaining (unconsumed) target slot.
 *   Any guess letter still unmatched after both passes scores notInWord.
 *
 * Example: guess "CRANE", target "REACH"
 *   C→+3, R→+1, A→+1, N→+3, E→+1  total=9
 */
export function scoreGuess(guess: string, target: string): GuessResult {
  const g = guess.toUpperCase()
  const t = target.toUpperCase()

  const scores = new Array<number>(CONFIG.wordLength).fill(CONFIG.scoring.notInWord)
  const targetUsed = new Array<boolean>(CONFIG.wordLength).fill(false)
  const guessUsed = new Array<boolean>(CONFIG.wordLength).fill(false)

  // First pass: exact position matches
  for (let i = 0; i < CONFIG.wordLength; i++) {
    if (g[i] === t[i]) {
      scores[i] = CONFIG.scoring.correctPosition
      targetUsed[i] = true
      guessUsed[i] = true
    }
  }

  // Second pass: correct letter, wrong position
  for (let i = 0; i < CONFIG.wordLength; i++) {
    if (guessUsed[i]) continue
    for (let j = 0; j < CONFIG.wordLength; j++) {
      if (targetUsed[j]) continue
      if (g[i] === t[j]) {
        scores[i] = CONFIG.scoring.correctLetter
        targetUsed[j] = true
        guessUsed[i] = true
        break
      }
    }
  }

  const total = scores.reduce((sum, s) => sum + s, 0)

  return {
    perLetter: scores as LetterScore[],
    total,
    isCorrect: total === 0,
  }
}
