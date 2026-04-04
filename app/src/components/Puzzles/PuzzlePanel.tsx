import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
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
  /** Other guesser's summary info on this puzzle, keyed by their player id. */
  const [othersInfo, setOthersInfo] = useState<Record<string, { guessCount: number; solved: boolean }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      const filtered = (otherGuessFile?.guesses ?? []).filter(
        (g) => g.puzzle_setter_id === setterId,
      )
      setOthersInfo({
        [otherGuesserId]: {
          guessCount: filtered.length,
          solved: filtered.some((g) => g.is_correct),
        },
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
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-2">
        <h2 className="mb-2 text-lg font-bold text-gray-900">Loading…</h2>
        <p className="text-sm text-gray-400">Fetching puzzle…</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        {setterName}&apos;s word
        {isSolved && targetWord && (
          <span className="ml-3 font-mono tracking-widest text-green-600">
            {targetWord}
          </span>
        )}
      </h2>

      <GuessList guesses={myGuesses} />

      <div className="mt-4">
        {isSolved ? (
          <p className="font-semibold text-green-600">
            Solved in {myGuesses.length} {myGuesses.length === 1 ? 'guess' : 'guesses'} 🎉
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
        others={Object.entries(othersInfo).map(([id, info]) => ({ playerId: id, ...info }))}
      />
    </div>
  )
}
