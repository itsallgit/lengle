interface GuessRowProps {
  word: string
  total: number
}

export default function GuessRow({ word, total }: GuessRowProps) {
  const isCorrect = total === 0
  const tileBase =
    'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white animate-tile-pop'
  const tileColor = isCorrect ? 'bg-emerald-500' : 'bg-indigo-600'

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
      <span
        className={`min-w-[2.25rem] rounded-full px-2.5 py-0.5 text-center text-sm font-bold ${
          isCorrect
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-400 text-amber-900'
        }`}
      >
        {total}
      </span>
    </div>
  )
}
