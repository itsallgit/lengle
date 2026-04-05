import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { listS3Keys, readJson } from '../../lib/s3'
import type { PlayerGuesses } from '../../types'

interface AllTimeStats {
  completedDayCount: number
  totalPastDays: number
  guesserScore: Record<string, number>
  wordSetterScore: Record<string, number>
  overallWinnerIds: string[]
}

function extractPastDates(keys: string[], activePuzzleDate: string): string[] {
  const dateSet = new Set<string>()
  for (const key of keys) {
    const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\//)
    if (match) {
      const d = match[1]
      if (d < activePuzzleDate) dateSet.add(d)
    }
  }
  return Array.from(dateSet).sort()
}

function isCompletedDay(
  guessesPerPlayer: (PlayerGuesses | null)[][],
  dateIndex: number,
): boolean {
  for (let pi = 0; pi < CONFIG.players.length; pi++) {
    const guesser = CONFIG.players[pi]
    const pg = guessesPerPlayer[pi][dateIndex]
    if (!pg) return false
    for (const setter of CONFIG.players) {
      if (setter.id === guesser.id) continue
      const forPuzzle = pg.guesses.filter((g) => g.puzzle_setter_id === setter.id)
      if (!forPuzzle.some((g) => g.is_correct)) return false
    }
  }
  return true
}

export default function AllTimeTab() {
  const [stats, setStats] = useState<AllTimeStats | null>(null)
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
      const activePuzzleDate = getActivePuzzleDate()
      const dayKeys = await listS3Keys('data/days/')
      const pastDates = extractPastDates(dayKeys, activePuzzleDate)

      const emptyScores = () => Object.fromEntries(CONFIG.players.map((p) => [p.id, 0]))

      if (pastDates.length === 0) {
        setStats({
          completedDayCount: 0,
          totalPastDays: 0,
          guesserScore: emptyScores(),
          wordSetterScore: emptyScores(),
          overallWinnerIds: CONFIG.players.map((p) => p.id),
        })
        setLoading(false)
        return
      }

      // Fetch all players' guess files for all past dates
      const guessesPerPlayer = (await Promise.all(
        CONFIG.players.map((player) =>
          Promise.all(
            pastDates.map((d) =>
              readJson<PlayerGuesses>(`data/days/${d}/guesses-${player.id}.json`),
            ),
          ),
        ),
      )) as (PlayerGuesses | null)[][]

      const guesserScore: Record<string, number> = emptyScores()
      const wordSetterScore: Record<string, number> = emptyScores()
      let completedDayCount = 0

      for (let di = 0; di < pastDates.length; di++) {
        if (!isCompletedDay(guessesPerPlayer, di)) continue
        completedDayCount++

        for (let pi = 0; pi < CONFIG.players.length; pi++) {
          const guesser = CONFIG.players[pi]
          const pg = guessesPerPlayer[pi][di]
          if (!pg) continue

          for (const setter of CONFIG.players) {
            if (setter.id === guesser.id) continue
            const forPuzzle = pg.guesses.filter((g) => g.puzzle_setter_id === setter.id)
            guesserScore[guesser.id] += forPuzzle.length
            wordSetterScore[setter.id] += forPuzzle.length
          }
        }
      }

      const minScore = Math.min(...CONFIG.players.map((p) => guesserScore[p.id]))
      const overallWinnerIds = CONFIG.players
        .filter((p) => guesserScore[p.id] === minScore)
        .map((p) => p.id)

      setStats({
        completedDayCount,
        totalPastDays: pastDates.length,
        guesserScore,
        wordSetterScore,
        overallWinnerIds,
      })
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  if (!stats) return null

  const sortedPlayers = [...CONFIG.players].sort(
    (a, b) => stats.guesserScore[a.id] - stats.guesserScore[b.id],
  )

  return (
    <div className="space-y-8">
      {/* Hero stat: completed days */}
      <div className="text-center">
        <p className="text-6xl font-black text-gray-900">{stats.completedDayCount}</p>
        <p className="mt-1 text-sm text-gray-500">Completed puzzle days</p>
        <p className="mt-1 text-xs text-gray-400 px-8">
          A completed puzzle day is when all three players finish all puzzles.
          Only completed days count toward total scores.
        </p>
      </div>

      {/* Overall leaderboard */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-900">Total Scores</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-right font-medium">Score</th>
              <th className="pb-1 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const isWinner = stats.overallWinnerIds.includes(player.id)
              return (
                <tr
                  key={player.id}
                  className={`border-b border-gray-100 ${isWinner && stats.completedDayCount > 0 ? 'bg-amber-50' : ''}`}
                >
                  <td className="py-2 font-medium text-gray-900">
                    {getPlayerDisplay(player.id)}
                  </td>
                  <td className="py-2 text-right font-bold text-gray-900">
                    {stats.guesserScore[player.id]}
                  </td>
                  <td className="py-2 text-right">
                    {isWinner && stats.completedDayCount > 0 && <span>🏆</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-400">Lowest score wins.</p>
      </div>

      {/* Per-player stats — single table with orange/green column headers */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="pb-1 text-left font-medium text-gray-700">Player</th>
              <th className="pb-1 text-center font-medium text-orange-500">Guesses to Solve</th>
              <th className="pb-1 text-center font-medium text-green-600">Guesses from Others</th>
            </tr>
            <tr className="text-xs text-gray-400">
              <th></th>
              <th className="pb-2 text-center">(lower is better)</th>
              <th className="pb-2 text-center">(higher is better)</th>
            </tr>
          </thead>
          <tbody>
            {CONFIG.players.map((player) => (
              <tr key={player.id} className="border-t border-gray-100">
                <td className="py-2 font-medium text-gray-900">{getPlayerDisplay(player.id)}</td>
                <td className="py-2 text-center font-bold text-gray-900">{stats.guesserScore[player.id]}</td>
                <td className="py-2 text-center font-bold text-gray-900">{stats.wordSetterScore[player.id]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
