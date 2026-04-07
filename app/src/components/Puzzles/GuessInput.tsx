import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../lib/config'
import WORD_LIST from '../../words/wordlist'

interface GuessInputProps {
  value: string
  onValueChange: (v: string) => void
  onSubmit: (word: string) => void
  disabled: boolean
  ownWord: string | null
}

export default function GuessInput({ value, onValueChange, onSubmit, disabled, ownWord }: GuessInputProps) {
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevDisabled = useRef(disabled)
  useEffect(() => {
    if (prevDisabled.current && !disabled) {
      inputRef.current?.focus()
    }
    prevDisabled.current = disabled
  }, [disabled])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const upper = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase()
    onValueChange(upper.slice(0, CONFIG.wordLength))
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
    onValueChange('')
    setError(null)
    inputRef.current?.focus()
  }

  const canSubmit = value.length === CONFIG.wordLength && !disabled

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={CONFIG.wordLength}
          ref={inputRef}
          className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 bg-white px-2 py-3 text-center text-lg font-bold uppercase tracking-widest text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
          aria-label="Enter guess"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="GUESS"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="shrink-0 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 disabled:opacity-40"
        >
          Go
        </button>
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
