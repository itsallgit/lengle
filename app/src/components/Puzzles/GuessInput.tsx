import { useState } from 'react'
import { CONFIG } from '../../lib/config'
import WORD_LIST from '../../words/wordlist'

interface GuessInputProps {
  onSubmit: (word: string) => void
  disabled: boolean
  ownWord: string | null
}

export default function GuessInput({ onSubmit, disabled, ownWord }: GuessInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const upper = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setValue(upper.slice(0, CONFIG.wordLength))
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const word = value.toUpperCase()

    if (ownWord !== null && word === ownWord.toUpperCase()) {
      setError('You cannot guess your own puzzle word')
      return
    }

    if (!WORD_LIST.has(word.toLowerCase())) {
      setError('Not a valid word — please try another')
      return
    }

    onSubmit(word)
    setValue('')
    setError(null)
  }

  const canSubmit = value.length === CONFIG.wordLength && !disabled

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={CONFIG.wordLength}
          className="border border-gray-300 rounded px-3 py-2 font-mono uppercase tracking-widest w-40 disabled:opacity-50"
          aria-label="Enter guess"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-40"
        >
          Submit
        </button>
      </div>
      {error && (
        <p className="text-red-600 text-sm" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
