import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { readJson, writeToS3 } from '../../lib/s3'
import { scoreGuess } from '../../lib/scoring'
import type { GuessEntry, PlayerGuesses, PuzzleWord } from '../../types'
import GuessInput from './GuessInput'
import GuessList from './GuessList'

interface PuzzlePanelProps {
  setterId: string
  currentPlayerId: string
  /** The current player's own puzzle word — passed for AC-01 validation in GuessInput. */
  ownWord: string | null
  date: string
}

export default function PuzzlePanel({
  setterId,
  currentPlayerId,
  ownWord,
  date,
}: PuzzlePanelProps) {
  // Security: targetWord is fetched immediately so scoring works, but is never
  // rendered in the UI until the puzzle is solved. See spec §5.2.
  const [targetWord, setTargetWord] = useState<string | null>(null)
  /** Current player's guesses on this puzzle, filtered to setterId. */
  const [myGuesses, setMyGuesses] = useState<GuessEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const isSolved = myGuesses.some((g) => g.is_correct)
  const setterPlayer = CONFIG.players.find((p) => p.id === setterId)
  const { playerEmojis } = usePlayer()
  const setterEmoji = setterPlayer ? (playerEmojis[setterId] ?? setterPlayer.defaultEmoji) : ''
  const setterName = setterPlayer ? `${setterEmoji} ${setterPlayer.name}` : setterId

  // Load targetWord, current player’s guesses, and other guesser’s guesses in parallel.
  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setIsLoading(true)

      const [targetFile, myGuessFile] = await Promise.all([
        readJson<PuzzleWord>(`data/words/${date}/${setterId}.json`),
        readJson<PlayerGuesses>(
          `data/days/${date}/guesses-${currentPlayerId}.json`,
        ),
      ])

      if (cancelled) return

      setTargetWord(targetFile?.word ?? null)
      setMyGuesses(
        (myGuessFile?.guesses ?? []).filter((g) => g.puzzle_setter_id === setterId),
      )

      setIsLoading(false)
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [date, setterId, currentPlayerId])

  async function handleGuessSubmit(word: string) {
    if (!targetWord || isSubmitting) return
    setIsSubmitting(true)

    try {
      const result = scoreGuess(word, targetWord)
      const guessFileKey = `data/days/${date}/guesses-${currentPlayerId}.json`

      // Re-read the full guess file immediately before writing to guard against
      // the race condition where both PuzzlePanel instances share the same file.
      // Never cache the full file in state — always re-read here on submit.
      const existingFile = await readJson<PlayerGuesses>(guessFileKey)
      const existingGuesses = existingFile?.guesses ?? []

      // guess_number is per-puzzle: count existing guesses for this setter + 1.
      const existingForThisPuzzle = existingGuesses.filter(
        (g) => g.puzzle_setter_id === setterId,
      )

      const newEntry: GuessEntry = {
        puzzle_setter_id: setterId,
        guess_number: existingForThisPuzzle.length + 1,
        word,
        per_letter_scores: result.perLetter,
        score: result.total,
        is_correct: result.isCorrect,
        submitted_at: new Date().toISOString(),
      }

      const updatedFile: PlayerGuesses = {
        date,
        guesser_id: currentPlayerId,
        guesses: [...existingGuesses, newEntry],
      }

      // Optimistic update — show the guess immediately while the write is in-flight.
      setMyGuesses((prev) => [...prev, newEntry])

      await writeToS3(guessFileKey, updatedFile)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between bg-violet-700 px-4 py-4 text-left"
          disabled
        >
          <span className="text-lg font-bold text-white">Loading…</span>
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between bg-violet-700 px-4 py-4 text-left"
        aria-expanded={expanded}
      >
        <span className="text-lg font-bold text-white">{setterName}&apos;s word</span>
        <div className="flex items-center gap-3">
          {isSolved
            ? <span className="text-sm text-green-400 font-semibold">✓ {myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'}</span>
            : myGuesses.length > 0
              ? <span className="text-sm text-gray-400">{myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'}</span>
              : null
          }
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      <div
        className={`overflow-hidden bg-white transition-all duration-200 ease-in-out ${
          expanded ? 'max-h-[2000px]' : 'max-h-0'
        }`}
      >
        <div className="px-5 pt-4 pb-4">
          {isSolved && targetWord && (
            <p className="mb-3 font-mono tracking-widest text-green-600 text-lg">{targetWord}</p>
          )}
          <GuessList guesses={myGuesses} />

          <div className="mt-4">
            {isSolved ? (
              <p className="font-semibold text-green-600">
                Solved in {myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'} 🎉
              </p>
            ) : !targetWord ? (
              <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                This puzzle word hasn’t been set yet.
              </p>
            ) : (
              <GuessInput
                onSubmit={handleGuessSubmit}
                disabled={isSubmitting}
                ownWord={ownWord}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
