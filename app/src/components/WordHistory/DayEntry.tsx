import { useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import type { DayData } from './WordHistory'

interface WordHistoryDayProps {
  date: string
  dayData: DayData | null
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day, 12)
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Renders the puzzle word as tiles — green letters if finished, grey ? tiles if not. */
function WordTiles({ word, finished }: { word: string | null; finished: boolean }) {
  if (finished && word) {
    return (
      <div className="flex gap-1.5">
        {word.split('').map((letter, i) => (
          <div
            key={i}
            className="flex h-11 w-11 items-center justify-center rounded-md bg-green-500 text-base font-bold text-white"
          >
            {letter}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-gray-500 text-base font-bold text-white"
        >
          ?
        </div>
      ))}
    </div>
  )
}

/** Single small grey ? tile for an incomplete/unknown result. */
function GreyQuestionTile() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-500 text-xs font-bold text-white">
      ?
    </span>
  )
}

export default function WordHistoryDay({ date, dayData }: WordHistoryDayProps) {
  const [expanded, setExpanded] = useState(false)
  const { playerEmojis } = usePlayer()

  function getPlayerDisplay(id: string): string {
    const player = CONFIG.players.find((p) => p.id === id)
    if (!player) return id
    const emoji = playerEmojis[id] ?? player.defaultEmoji
    return `${emoji} ${player.name}`
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      {/* Accordion header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-gray-900">{formatDate(date)}</span>
        <span className="flex items-center gap-2">
          {dayData === null ? (
            <span className="text-xs text-gray-400">Loading…</span>
          ) : dayData.allCompleted ? (
            <span className="text-xs font-medium text-green-600">✓ All completed</span>
          ) : (
            <span className="text-xs text-gray-400">Not all completed</span>
          )}
          <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      {/* Expanded content */}
      {expanded && dayData && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-0">
          {CONFIG.players.map((player, idx) => {
            const puzzle = dayData.puzzles.find((p) => p.setterId === player.id)
            return (
              <div
                key={player.id}
                className={`py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              >
                {/*
                  Single table: setter + tiles on row 1, each guesser + count on subsequent rows.
                  Column 1 (fixed w-28) holds player names; column 2 holds tiles / counts.
                  This keeps tiles and counts left-aligned at the same x-position.
                */}
                <table className="w-full text-sm">
                  <tbody>
                    {/* Row 1: setter name + word tiles */}
                    <tr>
                      <td className="w-28 py-2 align-middle text-sm font-semibold text-gray-700">
                        {getPlayerDisplay(player.id)}
                      </td>
                      <td className="py-2 align-middle">
                        <WordTiles
                          word={puzzle?.word ?? null}
                          finished={puzzle?.allFinished ?? false}
                        />
                      </td>
                    </tr>

                    {/* Rows 2+: each guesser + their guess count */}
                    {CONFIG.players
                      .filter((p) => p.id !== player.id)
                      .map((guesser) => {
                        const result = puzzle?.guesserResults.find(
                          (r) => r.playerId === guesser.id,
                        )
                        return (
                          <tr key={guesser.id} className="border-t border-gray-50">
                            <td className="w-28 py-1.5 font-medium text-gray-700">
                              {getPlayerDisplay(guesser.id)}
                            </td>
                            <td className="py-1.5 text-gray-600">
                              {result?.guessCount != null ? (
                                <span>
                                  <span className="text-base font-bold text-gray-900">{result.guessCount}</span>{' '}
                                  {result.guessCount === 1 ? 'guess' : 'guesses'}
                                </span>
                              ) : (
                                <GreyQuestionTile />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

