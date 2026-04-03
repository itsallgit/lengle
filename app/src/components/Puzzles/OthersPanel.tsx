import { useState } from 'react'
import { CONFIG } from '../../lib/config'
import type { GuessEntry } from '../../types'
import GuessList from './GuessList'

interface OthersPanelProps {
  setterId: string
  myGuessCount: number
  isSolved: boolean
  othersGuesses: Record<string, GuessEntry[]>
}

export default function OthersPanel({
  myGuessCount,
  isSolved,
  othersGuesses,
}: OthersPanelProps) {
  const [open, setOpen] = useState(false)

  const otherEntries = Object.entries(othersGuesses)

  if (otherEntries.length === 0) return null

  return (
    <div className="border-t border-gray-200 mt-3 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>Others</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3 pl-4">
          {otherEntries.map(([guesserId, guesses]) => {
            const player = CONFIG.players.find((p) => p.id === guesserId)
            const displayName = player?.name ?? guesserId
            const totalGuessCount = guesses.length
            const otherHasSolved = guesses.some((g) => g.is_correct)

            // AC-11: if I've solved and they've solved, show full history
            // AC-09: otherwise show only up to myGuessCount
            const visibleGuesses =
              isSolved && otherHasSolved
                ? guesses
                : guesses.slice(0, myGuessCount)

            return (
              <OtherPlayerPanel
                key={guesserId}
                name={displayName}
                totalGuessCount={totalGuessCount}
                visibleGuesses={visibleGuesses}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface OtherPlayerPanelProps {
  name: string
  totalGuessCount: number
  visibleGuesses: GuessEntry[]
}

function OtherPlayerPanel({ name, totalGuessCount, visibleGuesses }: OtherPlayerPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>
          {name} — {totalGuessCount} {totalGuessCount === 1 ? 'guess' : 'guesses'}
        </span>
      </button>

      {open && visibleGuesses.length > 0 && (
        <div className="mt-1 pl-4">
          <GuessList guesses={visibleGuesses} />
        </div>
      )}
    </div>
  )
}
