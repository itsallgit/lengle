import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { readJson } from '../../lib/s3'
import type { DayResults, PlayerGuesses } from '../../types'

interface PuzzleStats {
  setterId: string
  setterName: string
  setterDisplay: string
  guessCounts: Record<string, number | null> // guesser_id → count or null if unsolved
  winnerIds: string[]
}

interface TodayData {
  results: DayResults | null
  playerGuesses: Record<string, PlayerGuesses | null>
}

export default function TodayTab() {
  const [date] = useState(() => getActivePuzzleDate())
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const { playerEmojis } = usePlayer()

  function getPlayerDisplay(id: string): string {
    const player = CONFIG.players.find((p) => p.id === id)
    if (!player) return id
    const emoji = playerEmojis[id] ?? player.defaultEmoji
    return `${emoji} ${player.name}`
  }

  useEffect(() => {
    async function load() {
      // Fetch results file (may be null if day not yet finalised)
      const results = await readJson<DayResults>(
        `data/days/${date}/results.json`,
      )

      // Fetch all players' guess files for live in-progress data
      const entries = await Promise.all(
        CONFIG.players.map(async (p) => {
          const pg = await readJson<PlayerGuesses>(
            `data/days/${date}/guesses-${p.id}.json`,
          )
          return [p.id, pg] as const
        }),
      )
      const playerGuesses = Object.fromEntries(entries) as Record<
        string,
        PlayerGuesses | null
      >

      setData({ results, playerGuesses })
      setLoading(false)
    }
    void load()
  }, [date])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  const { results, playerGuesses } = data!

  // Build puzzle stats from live guess files (more up-to-date than results.json)
  const puzzleStats: PuzzleStats[] = CONFIG.players.map((setter) => {
    const guessCounts: Record<string, number | null> = {}

    for (const guesser of CONFIG.players) {
      if (guesser.id === setter.id) continue
      const pg = playerGuesses[guesser.id]
      if (!pg) {
        guessCounts[guesser.id] = null
        continue
      }
      const forPuzzle = pg.guesses.filter(
        (g) => g.puzzle_setter_id === setter.id,
      )
      const solved = forPuzzle.some((g) => g.is_correct)
      guessCounts[guesser.id] = solved ? forPuzzle.length : null
    }

    // Puzzle winner(s): solvers with fewest guesses
    const solvers = Object.entries(guessCounts)
      .filter(([, count]) => count !== null)
      .map(([id, count]) => ({ id, count: count! }))

    let winnerIds: string[] = []
    if (solvers.length > 0) {
      const min = Math.min(...solvers.map((s) => s.count))
      winnerIds = solvers.filter((s) => s.count === min).map((s) => s.id)
    }

    return {
      setterId: setter.id,
      setterName: setter.name,
      setterDisplay: getPlayerDisplay(setter.id),
      guessCounts,
      winnerIds,
    }
  })

  // Daily totals per player
  const dailyTotals = CONFIG.players.map((player) => {
    const pg = playerGuesses[player.id]
    const otherSetters = CONFIG.players.filter((p) => p.id !== player.id)

    let total = 0
    let solved = 0
    for (const setter of otherSetters) {
      if (!pg) continue
      const forPuzzle = pg.guesses.filter(
        (g) => g.puzzle_setter_id === setter.id,
      )
      total += forPuzzle.length
      if (forPuzzle.some((g) => g.is_correct)) solved++
    }

    return { playerId: player.id, playerDisplay: getPlayerDisplay(player.id), total, solved }
  })

  // Daily winner(s): lowest total among players who solved both puzzles
  const completedPlayers = dailyTotals.filter((d) => d.solved === 2)
  let dailyWinnerIds: string[] = []
  if (completedPlayers.length > 0) {
    const min = Math.min(...completedPlayers.map((d) => d.total))
    dailyWinnerIds = completedPlayers
      .filter((d) => d.total === min)
      .map((d) => d.playerId)
  }

  // Prefer finalised results.json for daily winner data if available
  const finalisedWinnerIds = results
    ? results.player_results
        .filter((r) => r.is_daily_winner)
        .map((r) => r.player_id)
    : dailyWinnerIds

  return (
    <div className="space-y-6">
      {/* Daily winner banner */}
      {finalisedWinnerIds.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">
            🏆{' '}
            {finalisedWinnerIds.length === 1
              ? `${getPlayerDisplay(finalisedWinnerIds[0])} wins today!`
              : `Joint winners: ${finalisedWinnerIds.map(getPlayerDisplay).join(' & ')}`}
          </p>
        </div>
      )}

      {/* Per-puzzle tables */}
      {puzzleStats.map((puzzle) => (
        <div key={puzzle.setterId} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-900">
            {puzzle.setterDisplay}&apos;s Puzzle
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="pb-1 font-medium">Player</th>
                <th className="pb-1 text-right font-medium">Guesses</th>
                <th className="pb-1 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {CONFIG.players
                .filter((p) => p.id !== puzzle.setterId)
                .map((guesser) => {
                  const count = puzzle.guessCounts[guesser.id]
                  const isWinner = puzzle.winnerIds.includes(guesser.id)
                  return (
                    <tr key={guesser.id} className={`border-b border-gray-100 ${isWinner ? 'bg-amber-50' : ''}`}>
                      <td className="py-2 font-medium text-gray-900">
                        {getPlayerDisplay(guesser.id)}
                      </td>
                      <td className="py-2 text-right font-bold text-gray-900">
                        {count !== null ? count : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {isWinner && <span>🏆</span>}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Daily scores table */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-900">
          Daily Totals
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-right font-medium">Total</th>
              <th className="pb-1 text-right font-medium">Solved</th>
              <th className="pb-1 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {dailyTotals.map((row) => {
              const isWinner = finalisedWinnerIds.includes(row.playerId)
              return (
                <tr key={row.playerId} className={`border-b border-gray-100 ${isWinner ? 'bg-amber-50' : ''}`}>
                  <td className="py-2 font-medium text-gray-900">
                    {row.playerDisplay}
                  </td>
                  <td className="py-2 text-right font-bold text-gray-900">
                    {row.solved > 0 ? row.total : '—'}
                  </td>
                  <td className="py-2 text-right text-gray-700">
                    {row.solved}/2
                  </td>
                  <td className="py-2 text-right">
                    {isWinner && <span>🏆</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Updates as players complete puzzles throughout the day.
      </p>
    </div>
  )
}
