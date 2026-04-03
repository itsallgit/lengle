import WORD_LIST from '../words/wordlist'

export const ERROR_MESSAGES = {
  notAValidWord: 'Not a valid word — please try another',
  alreadyUsed: 'This word has already been used — please try another',
} as const

/**
 * Returns true if the word exists in the bundled word list.
 * Comparison is case-insensitive (word list is lowercase).
 */
export function isInWordList(word: string): boolean {
  return WORD_LIST.has(word.toLowerCase())
}

/**
 * Validates a puzzle word (set by a player).
 * Returns an error message string if invalid, or null if valid.
 *
 * Checks in order:
 *   1. Must be in the bundled word list (AC-02)
 *   2. Must not have been used on any previous day by any player (AC-03)
 *
 * @param word           - the word to validate (any case; compared case-insensitively)
 * @param usedWords      - Set of previously used puzzle words in UPPERCASE
 */
export function validatePuzzleWord(
  word: string,
  usedWords: ReadonlySet<string>,
): string | null {
  if (!isInWordList(word)) {
    return ERROR_MESSAGES.notAValidWord
  }
  if (usedWords.has(word.toUpperCase())) {
    return ERROR_MESSAGES.alreadyUsed
  }
  return null
}

/**
 * Validates a guess word entered by a player.
 * Returns an error message string if invalid, or null if valid.
 *
 * Only checks dictionary membership (AC-04).
 * The AC-01 constraint (cannot guess own puzzle word) is enforced at the
 * puzzle panel level where the setter context is available.
 *
 * @param word - the guess to validate (any case)
 */
export function validateGuessWord(word: string): string | null {
  if (!isInWordList(word)) {
    return ERROR_MESSAGES.notAValidWord
  }
  return null
}
