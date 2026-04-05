import { useEffect, useState } from 'react'
import type { GuessEntry } from '../../types'
import GuessRow from './GuessRow'
import { type TileOverride } from './tileOverride'

interface GuessListProps {
  guesses: GuessEntry[]
}

export default function GuessList({ guesses }: GuessListProps) {
  const [overrides, setOverrides] = useState<(TileOverride | null)[][]>(() =>
    guesses.map((g) => Array(g.word.length).fill(null)),
  )

  // When a new guess is added, push a fresh all-null row
  useEffect(() => {
    setOverrides((prev) => {
      if (prev.length === guesses.length) return prev
      const next = [...prev]
      while (next.length < guesses.length) {
        const wordLen = guesses[next.length]?.word.length ?? 5
        next.push(Array(wordLen).fill(null))
      }
      return next
    })
  }, [guesses.length, guesses])

  const hasOverrides = overrides.some((row) => row.some((v) => v !== null))

  function handleOverrideChange(rowIndex: number, tileIndex: number, value: TileOverride | null) {
    setOverrides((prev) => {
      const next = prev.map((row) => [...row])
      next[rowIndex][tileIndex] = value
      return next
    })
  }

  function resetOverrides() {
    setOverrides(guesses.map((g) => Array(g.word.length).fill(null)))
  }

  return (
    <div className="space-y-2">
      {guesses.map((entry, index) => (
        <GuessRow
          key={`${entry.puzzle_setter_id}-${entry.guess_number}`}
          rowNumber={index + 1}
          word={entry.word}
          total={entry.score}
          perLetterScores={entry.per_letter_scores}
          overrides={overrides[index] ?? Array(entry.word.length).fill(null)}
          onOverrideChange={(tileIndex, value) =>
            handleOverrideChange(index, tileIndex, value)
          }
        />
      ))}
      {/* Reset Tiles — only shown after the first guess; disabled when no overrides exist */}
      {guesses.length > 0 && (
        <button
          type="button"
          onClick={hasOverrides ? resetOverrides : undefined}
          disabled={!hasOverrides}
          className={
            hasOverrides
              ? 'mt-6 w-full rounded-lg border border-gray-300 bg-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300'
              : 'mt-6 w-full rounded-lg border border-gray-200 bg-gray-100 py-1.5 text-xs font-medium text-gray-400 cursor-default'
          }
        >
          {hasOverrides ? 'Tap to reset tiles' : 'Tap tiles to change colours'}
        </button>
      )}
    </div>
  )
}


