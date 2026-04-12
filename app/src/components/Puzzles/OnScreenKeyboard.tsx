import { useMemo } from 'react'
import type { GuessEntry } from '../../types'
import type { TileOverride } from './tileOverride'

type NamedColor = 'green' | 'orange' | 'grey'

// Ordered so stripes always appear in a consistent sequence
const COLOR_ORDER: NamedColor[] = ['green', 'orange', 'grey']

const COLOR_HEX: Record<NamedColor, string> = {
  green:  '#16a34a',
  orange: '#fb923c',
  grey:   '#9ca3af',
}

const DEFAULT_BG = '#374151'

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

/**
 * Collects every tile-override color assigned to `letter` across all guesses.
 * Returns an ordered, deduplicated array of named colors, or an empty array if
 * the letter has not appeared or has no overrides set yet.
 */
function computeKeyColors(
  letter: string,
  guesses: GuessEntry[],
  overrides: (TileOverride | null)[][],
): NamedColor[] {
  const found = new Set<NamedColor>()
  guesses.forEach((guess, rowIdx) => {
    guess.word.toUpperCase().split('').forEach((char, colIdx) => {
      if (char === letter) {
        const override = overrides[rowIdx]?.[colIdx]
        if (override !== null && override !== undefined) {
          found.add(override as NamedColor)
        }
      }
    })
  })
  return COLOR_ORDER.filter((c) => found.has(c))
}

function buildKeyStyle(colors: NamedColor[]): React.CSSProperties {
  if (colors.length === 0) return { background: DEFAULT_BG }
  if (colors.length === 1) return { background: COLOR_HEX[colors[0]] }

  const pct = 100 / colors.length
  const stops = colors.flatMap((c, i) => [
    `${COLOR_HEX[c]} ${i * pct}%`,
    `${COLOR_HEX[c]} ${(i + 1) * pct}%`,
  ])
  return { background: `linear-gradient(to bottom, ${stops.join(', ')})` }
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
  const keyColorMap = useMemo(() => {
    const map: Record<string, NamedColor[]> = {}
    'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').forEach((l) => {
      map[l] = computeKeyColors(l, guesses, overrides)
    })
    return map
  }, [guesses, overrides])

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
              className={`${keyBase} text-white`}
              style={buildKeyStyle(keyColorMap[letter])}
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
              className={`${keyBase} flex-[1.5] text-white`}
              style={{ background: DEFAULT_BG }}
              aria-label="Backspace"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      <p className="mt-1 text-center text-xs text-gray-400">
        Key colours show all tile results for that letter
      </p>
    </div>
  )
}
