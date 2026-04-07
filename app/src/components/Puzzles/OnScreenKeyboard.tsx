import { useMemo } from 'react'
import type { GuessEntry } from '../../types'
import type { TileOverride } from './tileOverride'

type KeyColor = 'green' | 'orange' | 'grey' | 'default' | 'red'

const KEY_BG: Record<KeyColor, string> = {
  default: 'bg-gray-700 text-white',
  green:   'bg-green-600 text-white',
  orange:  'bg-orange-400 text-white',
  grey:    'bg-gray-400 text-white',
  red:     'bg-red-500 text-white',
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

function computeKeyColor(
  letter: string,
  guesses: GuessEntry[],
  overrides: (TileOverride | null)[][],
): KeyColor {
  // Find the most recent guess that contains this letter
  let lastRowIdx = -1
  for (let i = guesses.length - 1; i >= 0; i--) {
    if (guesses[i].word.toUpperCase().includes(letter)) {
      lastRowIdx = i
      break
    }
  }
  if (lastRowIdx === -1) return 'default'

  // Collect all tile overrides for this letter within that guess only
  const tileValues: (TileOverride | null)[] = []
  guesses[lastRowIdx].word.split('').forEach((char, colIdx) => {
    if (char.toUpperCase() === letter) {
      tileValues.push(overrides[lastRowIdx]?.[colIdx] ?? null)
    }
  })

  if (tileValues.some((v) => v === null)) return 'default'
  const unique = new Set(tileValues)
  if (unique.size === 1) return tileValues[0] as KeyColor
  return 'red'
}

interface OnScreenKeyboardProps {
  onLetterPress: (letter: string) => void
  onBackspace: () => void
  disabled: boolean
  guesses: GuessEntry[]
  overrides: (TileOverride | null)[][]
}

export default function OnScreenKeyboard({
  onLetterPress,
  onBackspace,
  disabled,
  guesses,
  overrides,
}: OnScreenKeyboardProps) {
  const keyColors = useMemo(() => {
    const map: Record<string, KeyColor> = {}
    'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').forEach((l) => {
      map[l] = computeKeyColor(l, guesses, overrides)
    })
    return map
  }, [guesses, overrides])

  const hasConflict = Object.values(keyColors).some((c) => c === 'red')

  const keyBase =
    'flex flex-1 items-center justify-center rounded-lg py-3 text-sm font-bold uppercase select-none active:opacity-70 transition-colors'

  return (
    <div className={`mt-3 w-full max-w-sm mx-auto space-y-1${disabled ? ' opacity-50 pointer-events-none' : ''}`}>
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1 justify-center">
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault()
                if (!disabled) onLetterPress(letter)
              }}
              className={`${keyBase} ${KEY_BG[keyColors[letter] ?? 'default']}`}
              aria-label={letter}
            >
              {letter}
            </button>
          ))}
          {rowIdx === ROWS.length - 1 && (
            <button
              type="button"
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault()
                if (!disabled) onBackspace()
              }}
              className={`${keyBase} flex-[1.5] ${KEY_BG.default}`}
              aria-label="Backspace"
            >
              ←
            </button>
          )}
        </div>
      ))}
      {hasConflict && (
        <p className="mt-1 text-center text-xs text-gray-500">
          Red key = conflicting tile colours for that letter
        </p>
      )}
      <p className="mt-1 text-center text-xs text-gray-400">
        Key colour matches most recent guess tile
      </p>
    </div>
  )
}
