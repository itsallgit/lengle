import { useState } from 'react'
import { scoreGuess } from '../../lib/scoring'
import WORD_LIST from '../../words/wordlist'
import type { GuessEntry } from '../../types'
import Header from '../shared/Header'
import GuessList from './GuessList'
import GuessInput from './GuessInput'

function pickRandomWord(): string {
  const words = Array.from(WORD_LIST)
  return words[Math.floor(Math.random() * words.length)].toUpperCase()
}

export default function PracticeView() {
  const [targetWord, setTargetWord] = useState<string>(() => pickRandomWord())
  const [guesses, setGuesses] = useState<GuessEntry[]>([])

  function handleGuessSubmit(word: string) {
    const result = scoreGuess(word, targetWord)
    const newEntry: GuessEntry = {
      puzzle_setter_id: 'practice',
      guess_number: guesses.length + 1,
      word,
      per_letter_scores: result.perLetter,
      score: result.total,
      is_correct: result.isCorrect,
      submitted_at: new Date().toISOString(),
    }
    setGuesses(prev => [...prev, newEntry])
  }

  function handleNewWord() {
    setTargetWord(pickRandomWord())
    setGuesses([])
  }

  const isSolved = guesses.some(g => g.is_correct)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <p className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Practice mode — the word is chosen at random and your guesses are not saved.
        </p>

        {isSolved && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-medium text-green-800">
              Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}! 🎉
            </p>
            <p className="font-mono text-lg font-bold tracking-widest text-green-700">
              {targetWord}
            </p>
            <button
              type="button"
              onClick={handleNewWord}
              className="mt-1 rounded-xl bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Play Again
            </button>
          </div>
        )}

        <GuessList guesses={guesses} />

        {!isSolved && (
          <GuessInput
            onSubmit={handleGuessSubmit}
            disabled={false}
            ownWord={null}
          />
        )}
      </main>
    </div>
  )
}
