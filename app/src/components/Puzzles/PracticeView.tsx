import { useRef, useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { CONFIG } from '../../lib/config'
import { scoreGuess } from '../../lib/scoring'
import WORD_LIST from '../../words/wordlist'
import type { GuessEntry } from '../../types'
import Header from '../shared/Header'
import GuessList from './GuessList'
import GuessInput from './GuessInput'
import OnScreenKeyboard from './OnScreenKeyboard'
import type { TileOverride } from './tileOverride'

function pickRandomWord(): string {
  const words = Array.from(WORD_LIST)
  return words[Math.floor(Math.random() * words.length)].toUpperCase()
}

export default function PracticeView() {
  const [targetWord, setTargetWord] = useState<string>(() => pickRandomWord())
  const [guesses, setGuesses] = useState<GuessEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [currentOverrides, setCurrentOverrides] = useState<(TileOverride | null)[][]>([])

  const lastInputSourceRef = useRef<'native' | 'onscreen'>('native')
  const { settings } = useSettings()

  function handleNativeInput(v: string) {
    lastInputSourceRef.current = 'native'
    setInputValue(v)
  }

  function handleOSKLetter(letter: string) {
    lastInputSourceRef.current = 'onscreen'
    setInputValue((prev) => (prev.length >= CONFIG.wordLength ? prev : prev + letter))
  }

  function handleOSKBackspace() {
    lastInputSourceRef.current = 'onscreen'
    setInputValue((prev) => prev.slice(0, -1))
  }

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
    setInputValue('')
  }

  function handleNewWord() {
    setTargetWord(pickRandomWord())
    setGuesses([])
    setInputValue('')
    setCurrentOverrides([])
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
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
            <p className="text-sm font-medium text-green-800">
              Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}! 🎉
            </p>
            <button
              type="button"
              onClick={handleNewWord}
              className="w-full rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Play Again
            </button>
          </div>
        )}

        <GuessList guesses={guesses} onOverridesChange={setCurrentOverrides} />

        {!isSolved && (
          <>
            <GuessInput
              value={inputValue}
              onValueChange={handleNativeInput}
              onSubmit={handleGuessSubmit}
              disabled={false}
              ownWord={null}
              shouldFocusAfterSubmit={lastInputSourceRef.current === 'native'}
            />
            {settings.showKeyboard && (
              <OnScreenKeyboard
                onLetterPress={handleOSKLetter}
                onBackspace={handleOSKBackspace}
                disabled={false}
                guesses={guesses}
                overrides={currentOverrides}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
