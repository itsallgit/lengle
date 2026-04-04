import type { GuessEntry } from '../../types'
import GuessRow from './GuessRow'

interface GuessListProps {
  guesses: GuessEntry[]
}

export default function GuessList({ guesses }: GuessListProps) {
  return (
    <div className="space-y-2">
      {guesses.map((entry) => (
        <GuessRow
          key={`${entry.puzzle_setter_id}-${entry.guess_number}`}
          word={entry.word}
          total={entry.score}
        />
      ))}
    </div>
  )
}
