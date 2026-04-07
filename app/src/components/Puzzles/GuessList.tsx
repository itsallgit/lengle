import { useEffect, useRef, useState } from 'react'
import type { GuessEntry } from '../../types'
import GuessRow from './GuessRow'
import { type TileOverride } from './tileOverride'

interface GuessListProps {
  guesses: GuessEntry[]
  initialOverrides?: (TileOverride | null)[][]
  onSolveSnapshot?: (overrides: (TileOverride | null)[][], guessCount: number) => void
  onOverridesChange?: (overrides: (TileOverride | null)[][]) => void
}

export default function GuessList({ guesses, initialOverrides, onSolveSnapshot, onOverridesChange }: GuessListProps) {
  const [overrides, setOverrides] = useState<(TileOverride | null)[][]>(() =>
    initialOverrides && initialOverrides.length === guesses.length
      ? initialOverrides
      : guesses.map((g) => Array(g.word.length).fill(null)),
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

  useEffect(() => {
    onOverridesChange?.(overrides)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Sync initial state to parent on mount

  const wasSolvedRef = useRef(false)
  const isSolved = guesses.some((g) => g.is_correct)

  useEffect(() => {
    if (isSolved && !wasSolvedRef.current) {
      wasSolvedRef.current = true
      const paddedOverrides = guesses.map((g, i) =>
        overrides[i] ?? Array(g.word.length).fill(null),
      )
      onSolveSnapshot?.(paddedOverrides, guesses.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolved])

  const hasOverrides = overrides.some((row) => row.some((v) => v !== null))

  function handleOverrideChange(rowIndex: number, tileIndex: number, value: TileOverride | null) {
    const next = overrides.map((row) => [...row])
    next[rowIndex][tileIndex] = value
    setOverrides(next)
    onOverridesChange?.(next)
  }

  function resetOverrides() {
    const next = guesses.map((g) => Array(g.word.length).fill(null))
    setOverrides(next)
    onOverridesChange?.(next)
  }

  function handleSetAllLetterToColor(letter: string, color: TileOverride | null) {
    const upperLetter = letter.toUpperCase()
    const next = overrides.map((row, rowIndex) =>
      row.map((override, tileIndex) => {
        if (guesses[rowIndex]?.word[tileIndex]?.toUpperCase() === upperLetter) {
          return color
        }
        return override
      })
    )
    setOverrides(next)
    onOverridesChange?.(next)
  }

  return (
    <div className="space-y-2">
      {/* Reset Tiles — only shown after the first guess; hidden when solved; disabled when no overrides exist */}
      {guesses.length > 0 && !isSolved && (
        <button
          type="button"
          onClick={hasOverrides ? resetOverrides : undefined}
          disabled={!hasOverrides}
          className={
            hasOverrides
              ? 'mb-2 w-full rounded-lg border border-gray-300 bg-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300'
              : 'mb-2 w-full rounded-lg border border-gray-200 bg-gray-100 py-1.5 text-xs font-medium text-gray-400 cursor-default'
          }
        >
          {hasOverrides ? 'Tap here to reset tiles' : 'Tap to change tile colour — Hold to change all tiles'}
        </button>
      )}
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
          onSetAllLetterToColor={handleSetAllLetterToColor}
          disabled={isSolved}
        />
      ))}
    </div>
  )
}


