import { CONFIG } from '../../lib/config'
import type { TileOverride } from './tileOverride'
import { TILE_CYCLE } from './tileOverride'

const COLOR_CLASS: Record<NonNullable<TileOverride>, string> = {
  green: 'bg-green-600',
  orange: 'bg-orange-400',
  grey: 'bg-gray-400',
}

interface GuessRowProps {
  rowNumber: number
  word: string
  total: number
  perLetterScores: number[]
  overrides: (TileOverride | null)[]
  onOverrideChange: (tileIndex: number, value: TileOverride | null) => void
}

export default function GuessRow({
  rowNumber,
  word,
  total,
  perLetterScores,
  overrides,
  onOverrideChange,
}: GuessRowProps) {
  const isCorrect = total === 0
  const tileBase =
    'flex flex-1 aspect-square items-center justify-center rounded-lg text-lg font-bold text-white animate-tile-pop'

  function cycleColor(i: number) {
    const current = TILE_CYCLE.indexOf(overrides[i])
    onOverrideChange(i, TILE_CYCLE[(current + 1) % TILE_CYCLE.length])
  }

  // Count-based mini tile stats (not per-position)
  const greenCount = perLetterScores.filter(s => s === CONFIG.scoring.correctPosition).length
  const orangeCount = perLetterScores.filter(s => s === CONFIG.scoring.correctLetter).length
  const greyCount = perLetterScores.filter(s => s === CONFIG.scoring.notInWord).length

  return (
    <div className="flex items-center gap-2">
      <span className="w-4 shrink-0 text-right text-xs text-gray-400">{rowNumber}</span>
      <div className="flex flex-1 gap-1">
        {word.split('').map((letter, i) => {
          const override = overrides[i]
          const tileColorClass =
            override !== null
              ? COLOR_CLASS[override]
              : isCorrect
              ? 'bg-green-600'
              : 'bg-gray-700'
          return (
            <div
              key={i}
              className={`${tileBase} ${tileColorClass}${!isCorrect ? ' cursor-pointer' : ''}`}
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={isCorrect ? undefined : () => cycleColor(i)}
              title={!isCorrect ? 'Click to annotate' : undefined}
            >
              {letter}
            </div>
          )
        })}
      </div>
      {/* Count-based mini tile rows — fixed 60px so tiles autoscale with remaining width */}
      <div className="flex shrink-0 flex-col gap-0.5" style={{ width: '60px' }}>
        {greenCount > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: greenCount }).map((_, i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-sm bg-green-500" />
            ))}
          </div>
        )}
        {orangeCount > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: orangeCount }).map((_, i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-sm bg-orange-400" />
            ))}
          </div>
        )}
        {greyCount > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: greyCount }).map((_, i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-sm bg-gray-400" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
