import { useCallback, useEffect, useState } from 'react'
import { CONFIG } from '../../lib/config'
import { readJson, writeToS3 } from '../../lib/s3'
import { scoreGuess } from '../../lib/scoring'
import type { GuessEntry, PlayerGuesses, PuzzleWord } from '../../types'
import GuessInput from './GuessInput'
import GuessList from './GuessList'
import OthersPanel from './OthersPanel'

interface PuzzlePanelProps {
  setterId: string
  currentPlayerId: string
  otherGuesserId: string
  /** The current player's own puzzle word — passed for AC-01 validation in GuessInput. */
  ownWord: string | null
  date: string
}

export default function PuzzlePanel({
  setterId,
  currentPlayerId,
  otherGuesserId,
  ownWord,
  date,
}: PuzzlePanelProps) {
  // Security: targetWord is fetched immediately so scoring works, but is never
  // rendered in the UI until the puzzle is solved. See spec §5.2.
  const [targetWord, setTargetWord] = useState<string | null>(null)
  /** Current player's guesses on this puzzle, filtered to setterId. */
  const [myGuesses, setMyGuesses] = useState<GuessEntry[]>([])
  /** Other guesser's guesses on this puzzle, keyed by their player id. */
  const [othersGuesses, setOthersGuesses] = useState<Record<string, GuessEntry[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSolved = myGuesses.some((g) => g.is_correct)
  const setterName = CONFIG.players.find((p) => p.id === setterId)?.name ?? setterId

  // Refetches the other guesser's guesses (filtered to this puzzle).
  // Called after a correct guess to pick up newly visible rows — AC-11.
  const fetchOthersGuesses = useCallback(async () => {
    const file = await readJson<PlayerGuesses>(
      `data/days/${date}/guesses-${otherGuesserId}.json`,
    )
    const filtered = (file?.guesses ?? []).filter((g) => g.puzzle_setter_id === setterId)
    setOthersGuesses({ [otherGuesserId]: filtered })
  }, [date, otherGuesserId, setterId])

  // Load targetWord, current player's guesses, and other guesser's guesses in parallel.
  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setIsLoading(true)

      const [targetFile, myGuessFile, otherGuessFile] = await Promise.all([
        readJson<PuzzleWord>(`data/words/${date}/${setterId}.json`),
        readJson<PlayerGuesses>(
          `data/days/${date}/guesses-${currentPlayerId}.json`,
        ),
        readJson<PlayerGuesses>(
          `data/days/${date}/guesses-${otherGuesserId}.json`,
        ),
      ])

      if (cancelled) return

      setTargetWord(targetFile?.word ?? null)
      setMyGuesses(
        (myGuessFile?.guesses ?? []).filter((g) => g.puzzle_setter_id === setterId),
      )
      setOthersGuesses({
        [otherGuesserId]: (otherGuessFile?.guesses ?? []).filter(
          (g) => g.puzzle_setter_id === setterId,
        ),
      })

      setIsLoading(false)
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [date, setterId, currentPlayerId, otherGuesserId])

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

      // AC-11: once solved, re-fetch the other player's guesses so their full
      // history becomes mutually visible if they've also solved this puzzle.
      if (result.isCorrect) {
        await fetchOthersGuesses()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-lg mb-2">{setterName}'s word</h2>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h2 className="font-semibold text-lg mb-3">
        {setterName}'s word
        {isSolved && targetWord && (
          <span className="ml-3 font-mono text-base font-bold text-green-700">
            {targetWord}
          </span>
        )}
      </h2>

      <GuessList guesses={myGuesses} />

      <div className="mt-3">
        {isSolved ? (
          <p className="font-medium text-green-700">
            Solved in {myGuesses.length} guesses 🎉
          </p>
        ) : (
          <GuessInput
            onSubmit={handleGuessSubmit}
            disabled={isSubmitting || !targetWord}
            ownWord={ownWord}
          />
        )}
      </div>

      <OthersPanel
        setterId={setterId}
        myGuessCount={myGuesses.length}
        isSolved={isSolved}
        othersGuesses={othersGuesses}
      />
    </div>
  )
}
