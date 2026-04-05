import { useState } from 'react'
import { CONFIG } from '../../lib/config'

type TileOverride = 'green' | 'orange' | 'grey' | null

const CYCLE: TileOverride[] = ['green', 'orange', 'grey', null]

const COLOR_CLASS: Record<'green' | 'orange' | 'grey', string> = {
  green: 'bg-green-600',
  orange: 'bg-orange-400',
  grey: 'bg-gray-700',
}

interface GuessRowProps {
  rowNumber: number
  word: string
  total: number
  perLetterScores: number[]
}

export default function GuessRow({ rowNumber, word, total, perLetterScores }: GuessRowProps) {
  const isCorrect = total === 0
  const tileBase =
    'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white animate-tile-pop'

  const [overrides, setOverrides] = useState<TileOverride[]>(
    () => Array(word.length).fill(null),
  )

  function cycleColor(i: number) {
    setOverrides((prev) => {
      const next = [...prev]
      const current = CYCLE.indexOf(prev[i])
      next[i] = CYCLE[(current + 1) % CYCLE.length]
      return next
    })
  }

  const green = perLetterScores.filter((s) => s === CONFIG.scoring.correctPosition).length
  const yellow = perLetterScores.filter((s) => s === CONFIG.scoring.correctLetter).length
  const grey = perLetterScores.filter((s) => s === CONFIG.scoring.notInWord).length

  return (
    <div className="flex items-center gap-2">
      <span className="w-5 shrink-0 text-right text-xs text-gray-400">{rowNumber}</span>
      <div className="flex gap-1.5">
        {word.split('').map((letter, i) => {
          const tileColor =
            overrides[i] !== null
              ? COLOR_CLASS[overrides[i]!]
              : isCorrect
              ? 'bg-green-600'
              : 'bg-gray-700'
          return (
            <div
              key={i}
              className={`${tileBase} ${tileColor}${!isCorrect ? ' cursor-pointer' : ''}`}
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={isCorrect ? undefined : () => cycleColor(i)}
              title={!isCorrect ? 'Click to annotate' : undefined}
            >
              {letter}
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-0.5">
        {green > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: green }).map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-sm bg-green-500" />
            ))}
          </div>
        )}
        {yellow > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: yellow }).map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-sm bg-orange-400" />
            ))}
          </div>
        )}
        {grey > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: grey }).map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-sm bg-gray-200" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
