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

  // Build sorted array of mini square colours: green first, then yellow, then grey
  const miniSquares: string[] = [
    ...Array(green).fill('bg-green-500'),
    ...Array(yellow).fill('bg-orange-400'),
    ...Array(grey).fill('bg-gray-200'),
  ]

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
      <div className="flex gap-0.5">
        {miniSquares.map((colour, i) => (
          <div key={i} className={`h-3 w-3 rounded-sm ${colour}`} />
        ))}
      </div>
      {!isCorrect && (
        <span className="text-xs text-gray-400 font-normal">({total})</span>
      )}
    </div>
  )
}
