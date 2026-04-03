import { useState } from 'react'
import { CONFIG } from '../../lib/config'
import { validatePuzzleWord } from '../../lib/validation'

interface Props {
  /** Label shown above the form e.g. "Set today's word" or "Set tomorrow's word" */
  label: string
  /** The set of previously used puzzle words (UPPERCASE) for uniqueness check. */
  usedWords: ReadonlySet<string>
  /** Called with the validated UPPERCASE word once submission succeeds. */
  onSubmit: (word: string) => Promise<void>
}

/**
 * A controlled word-entry form used for both today's and tomorrow's puzzle word.
 *
 * Validates against the bundled word list and the provided usedWords set
 * (AC-02, AC-03). Shows inline error messages on failure (spec §4.1).
 * Auto-uppercases input and limits to exactly 5 alpha characters (spec §8 Screen 3).
 */
export default function WordSetForm({ label, usedWords, onSubmit }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Accept alpha only, auto-uppercase, max 5 characters
    const cleaned = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase()
    setValue(cleaned.slice(0, CONFIG.wordLength))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.length !== CONFIG.wordLength) return

    const validationError = validatePuzzleWord(value, usedWords)
    if (validationError !== null) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(value)
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <p className="text-sm font-medium text-gray-700">{label}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          maxLength={CONFIG.wordLength}
          placeholder="WORD"
          aria-label="Enter your puzzle word"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-lg uppercase tracking-widest text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={value.length !== CONFIG.wordLength || submitting}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Saving…' : 'Submit'}
        </button>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}
