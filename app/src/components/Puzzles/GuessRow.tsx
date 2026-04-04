import { CONFIG } from '../../lib/config'

interface GuessRowProps {
  word: string
  total: number
  perLetterScores: number[]
}

export default function GuessRow({ word, total, perLetterScores }: GuessRowProps) {
  const isCorrect = total === 0
  const tileBase =
    'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white animate-tile-pop'
  const tileColor = isCorrect ? 'bg-green-600' : 'bg-gray-700'

  const green = perLetterScores.filter((s) => s === CONFIG.scoring.correctPosition).length
  const yellow = perLetterScores.filter((s) => s === CONFIG.scoring.correctLetter).length
  const grey = perLetterScores.filter((s) => s === CONFIG.scoring.notInWord).length

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        {word.split('').map((letter, i) => (
          <div
            key={i}
            className={`${tileBase} ${tileColor}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {letter}
          </div>
        ))}
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
