import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { readJson } from '../../lib/s3'
import type { GuessEntry, PlayerGuesses, PuzzleWord, SavedWorking } from '../../types'
import Header from '../shared/Header'
import GuessList from './GuessList'
import type { TileOverride } from './tileOverride'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day, 12)
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PastPuzzleDetail() {
  const { date, setterId, guesserId } = useParams<{ date: string; setterId: string; guesserId: string }>()
  const { playerEmojis } = usePlayer()

  const [isLoading, setIsLoading] = useState(true)
  const [allCompleted, setAllCompleted] = useState(false)
  const [targetWord, setTargetWord] = useState<string | null>(null)
  const [filteredGuesses, setFilteredGuesses] = useState<GuessEntry[]>([])
  const [savedOverrides, setSavedOverrides] = useState<(TileOverride | null)[][] | undefined>(undefined)

  useEffect(() => {
    if (!date || !setterId || !guesserId) return

    // Fetch the target puzzle data plus ALL players' guess files to verify every
    // player has solved every puzzle before showing any guesses.
    const allGuessFiles = CONFIG.players.map((p) =>
      readJson<PlayerGuesses>(`data/days/${date}/guesses-${p.id}.json`),
    )

    Promise.all([
      readJson<PuzzleWord>(`data/words/${date}/${setterId}.json`),
      readJson<SavedWorking>(`data/days/${date}/saved-working-${guesserId}.json`),
      ...allGuessFiles,
    ]).then(([wordFile, workingFile, ...allGuesses]) => {
      // Check all completed: for every setter, every non-setter guesser must have
      // a correct guess in their file.
      const completed = CONFIG.players.every((setter) =>
        CONFIG.players
          .filter((p) => p.id !== setter.id)
          .every((guesser) => {
            const idx = CONFIG.players.findIndex((p) => p.id === guesser.id)
            const pg = allGuesses[idx] as PlayerGuesses | null
            return pg?.guesses.some(
              (g) => g.puzzle_setter_id === setter.id && g.is_correct,
            ) ?? false
          }),
      )
      setAllCompleted(completed)

      if (completed) {
        setTargetWord((wordFile as PuzzleWord | null)?.word ?? null)

        const guesserIdx = CONFIG.players.findIndex((p) => p.id === guesserId)
        const guessFile = allGuesses[guesserIdx] as PlayerGuesses | null
        const guesses = (guessFile?.guesses ?? []).filter(
          (g) => g.puzzle_setter_id === setterId,
        )
        setFilteredGuesses(guesses)

        const savedEntry = (workingFile as SavedWorking | null)?.entries.find(
          (e) => e.puzzle_setter_id === setterId,
        )
        if (savedEntry) {
          setSavedOverrides(savedEntry.tile_overrides as (TileOverride | null)[][])
        }
      }

      setIsLoading(false)
    })
  }, [date, setterId, guesserId])

  function getPlayerEmoji(id: string): string {
    const player = CONFIG.players.find((p) => p.id === id)
    if (!player) return ''
    return playerEmojis[id] ?? player.defaultEmoji
  }

  function getPlayerName(id: string): string {
    return CONFIG.players.find((p) => p.id === id)?.name ?? id
  }

  const isSolved = filteredGuesses.some((g) => g.is_correct)
  const formattedDate = date ? formatDate(date) : ''
  const setterEmoji = setterId ? getPlayerEmoji(setterId) : ''
  const setterName = setterId ? getPlayerName(setterId) : ''
  const guesserEmoji = guesserId ? getPlayerEmoji(guesserId) : ''
  const guesserName = guesserId ? getPlayerName(guesserId) : ''

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg px-4 py-6 space-y-4">

          {/* Summary card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-center text-sm font-bold text-gray-900">{formattedDate}</p>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="text-4xl">{setterEmoji}</span>
                <span className="text-sm font-semibold text-gray-900">{setterName}</span>
                <span className="text-xs text-gray-500">Puzzle</span>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="text-4xl">{guesserEmoji}</span>
                <span className="text-sm font-semibold text-gray-900">{guesserName}</span>
                <span className="text-xs text-gray-500">Guesses</span>
              </div>
            </div>
          </div>

          {/* Puzzle view (read-only) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-gray-200" />
                ))}
              </div>
            ) : !allCompleted ? (
              <p className="text-sm text-gray-500 text-center py-2">
                Guesses are only visible once all players have completed all puzzles for this day.
              </p>
            ) : (
              <>
                {isSolved && targetWord && (
                  <p className="mb-3 text-center font-mono tracking-widest text-green-600 text-lg">{targetWord}</p>
                )}
                <GuessList
                  guesses={filteredGuesses}
                  initialOverrides={savedOverrides}
                />
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
