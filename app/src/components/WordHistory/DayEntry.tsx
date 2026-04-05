import { useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import type { GuessEntry } from '../../types'
import type { DayHistoryData } from './WordHistory'

interface Props {
  day: DayHistoryData
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Displays a single guess row: word and total score. */
function GuessHistoryRow({ guess }: { guess: GuessEntry }) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-xs">
      <span className="w-12 font-semibold tracking-widest text-gray-900">
        {guess.word}
      </span>
      <span className="font-semibold text-gray-700">= {guess.score}</span>
      {guess.is_correct && (
        <span className="font-sans text-xs text-gray-500">✓</span>
      )}
    </div>
  )
}

/** One puzzle's worth of guesses for a given guesser. */
function PuzzleGuessBlock({
  guesserName,
  setterId,
  guessEntries,
}: {
  guesserName: string
  setterId: string
  guessEntries: GuessEntry[]
}) {
  const forPuzzle = guessEntries.filter(
    (g) => g.puzzle_setter_id === setterId,
  )
  const solved = forPuzzle.some((g) => g.is_correct)

  if (forPuzzle.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-600">{guesserName}</p>
        <p className="text-xs italic text-gray-400">No guesses recorded</p>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-gray-600">
        {guesserName} —{' '}
        {solved ? (
          <span className="text-gray-700">
            Solved in {forPuzzle.length}{' '}
            {forPuzzle.length === 1 ? 'guess' : 'guesses'}
          </span>
        ) : (
          <span className="italic text-gray-400">Not solved</span>
        )}
      </p>
      <div className="mt-1 space-y-0.5">
        {forPuzzle.map((g, i) => (
          <GuessHistoryRow key={i} guess={g} />
        ))}
      </div>
    </div>
  )
}

/** Displays the puzzle answer word as a row of green tiles. */
function WordTilesDisplay({ word }: { word: string }) {
  return (
    <div className="my-2 flex gap-1">
      {word.split('').map((letter, i) => (
        <div
          key={i}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-sm font-bold text-white"
        >
          {letter}
        </div>
      ))}
    </div>
  )
}

export default function DayEntry({ day }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { playerEmojis } = usePlayer()

  function getPlayerDisplay(id: string): string {
    const player = CONFIG.players.find((p) => p.id === id)
    if (!player) return id
    const emoji = playerEmojis[id] ?? player.defaultEmoji
    return `${emoji} ${player.name}`
  }

  const dailyWinners =
    day.results?.player_results
      .filter((r) => r.is_daily_winner)
      .map((r) => getPlayerDisplay(r.player_id)) ?? []

  return (
    <div className="rounded-md border border-gray-200">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <span className="text-sm font-semibold text-gray-900">
            {formatDate(day.date)}
          </span>
          {dailyWinners.length > 0 && (
            <span className="ml-3 text-xs text-gray-500">
              Winner: {dailyWinners.join(' & ')}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {CONFIG.players.map((setter) => {
            const wordFile = day.words[setter.id]
            const guessers = CONFIG.players.filter((p) => p.id !== setter.id)

            return (
              <div key={setter.id} className="mb-5 last:mb-0">
                {/* Puzzle word */}
                <p className="text-sm font-semibold text-gray-900">
                  {getPlayerDisplay(setter.id)}&apos;s word
                </p>
                {wordFile ? (
                  <WordTilesDisplay word={wordFile.word} />
                ) : (
                  <p className="mt-1 text-xs italic text-gray-400">unknown</p>
                )}

                {/* Per-guesser breakdown */}
                {guessers.map((guesser) => {
                  const pg = day.guesses[guesser.id]
                  if (!pg) {
                    return (
                      <div key={guesser.id} className="mt-2">
                        <p className="text-xs font-medium text-gray-600">
                          {guesser.name}
                        </p>
                        <p className="text-xs italic text-gray-400">
                          No guesses recorded
                        </p>
                      </div>
                    )
                  }
                  return (
                    <PuzzleGuessBlock
                      key={guesser.id}
                      guesserName={getPlayerDisplay(guesser.id)}
                      setterId={setter.id}
                      guessEntries={pg.guesses}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
