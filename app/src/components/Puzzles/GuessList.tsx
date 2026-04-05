import type { GuessEntry } from '../../types'
import GuessRow from './GuessRow'

interface GuessListProps {
  guesses: GuessEntry[]
}

export default function GuessList({ guesses }: GuessListProps) {
  return (
    <div className="space-y-2">
      {guesses.map((entry, index) => (
        <GuessRow
          key={`${entry.puzzle_setter_id}-${entry.guess_number}`}
          rowNumber={index + 1}
          word={entry.word}
          total={entry.score}
          perLetterScores={entry.per_letter_scores}
        />
      ))}
    </div>
  )
}
