interface GuessRowProps {
  word: string
  perLetterScores: number[]
  total: number
}

export default function GuessRow({ word, perLetterScores, total }: GuessRowProps) {
  const scoresDisplay = `[${perLetterScores.join(', ')}]`
  return (
    <div className="font-mono text-sm">
      {word} → {scoresDisplay} = {total}
    </div>
  )
}
