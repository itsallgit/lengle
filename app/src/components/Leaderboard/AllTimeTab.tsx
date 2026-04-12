import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { listS3Keys, readJson } from '../../lib/s3'
import type { PlayerGuesses } from '../../types'

interface DayStats {
  date: string
  guesserScore: Record<string, number>
  wordSetterScore: Record<string, number>
}

interface AllTimeStats {
  daysWithData: number
  guesserScore: Record<string, number>
  wordSetterScore: Record<string, number>
  overallWinnerIds: string[]
  dayStats: DayStats[]
}

function extractPastDates(keys: string[], activePuzzleDate: string): string[] {
  const dateSet = new Set<string>()
  for (const key of keys) {
    const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\//)
    if (match) {
      const d = match[1]
      if (d <= activePuzzleDate) dateSet.add(d)
    }
  }
  return Array.from(dateSet).sort()
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function AllTimeTab() {
  const [stats, setStats] = useState<AllTimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyView, setHistoryView] = useState<'guesses' | 'points'>('guesses')
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
          daysWithData: 0,
          guesserScore: emptyScores(),
          wordSetterScore: emptyScores(),
          overallWinnerIds: CONFIG.players.map((p) => p.id),
          dayStats: [],
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
      let daysWithData = 0
      const dayStatsArr: DayStats[] = []

      for (let di = 0; di < pastDates.length; di++) {
        const dayGuesserScore: Record<string, number> = emptyScores()
        const dayWordSetterScore: Record<string, number> = emptyScores()
        let dayHasData = false

        for (let pi = 0; pi < CONFIG.players.length; pi++) {
          const guesser = CONFIG.players[pi]
          const pg = guessesPerPlayer[pi][di]
          if (!pg) continue
          for (const setter of CONFIG.players) {
            if (setter.id === guesser.id) continue
            const forPuzzle = pg.guesses.filter((g) => g.puzzle_setter_id === setter.id)
            if (forPuzzle.length > 0) dayHasData = true
            dayGuesserScore[guesser.id] += forPuzzle.length
            dayWordSetterScore[setter.id] += forPuzzle.length
            guesserScore[guesser.id] += forPuzzle.length
            wordSetterScore[setter.id] += forPuzzle.length
          }
        }

        if (dayHasData) {
          daysWithData++
          dayStatsArr.push({
            date: pastDates[di],
            guesserScore: dayGuesserScore,
            wordSetterScore: dayWordSetterScore,
          })
        }
      }

      // Newest first
      dayStatsArr.reverse()

      const hasData = Object.values(guesserScore).some((s) => s > 0)
      const minScore = hasData
        ? Math.min(...CONFIG.players.map((p) => guesserScore[p.id]))
        : 0
      const overallWinnerIds = hasData
        ? CONFIG.players.filter((p) => guesserScore[p.id] === minScore).map((p) => p.id)
        : CONFIG.players.map((p) => p.id)

      setStats({
        daysWithData,
        guesserScore,
        wordSetterScore,
        overallWinnerIds,
        dayStats: dayStatsArr,
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

  const hasData = Object.values(stats.guesserScore).some((s) => s > 0)
  const leastGuessesPlayer = sortedPlayers[0]
  const maxPoints = Math.max(...CONFIG.players.map((p) => stats.wordSetterScore[p.id]))
  const mostPointsPlayer =
    CONFIG.players.find((p) => stats.wordSetterScore[p.id] === maxPoints) ?? CONFIG.players[0]

  return (
    <div className="space-y-8">
      {/* Hero stat: days played */}
      <div className="text-center">
        <p className="text-6xl font-black text-gray-900">{stats.daysWithData}</p>
        <p className="mt-1 text-sm text-gray-500">Puzzle days played</p>
      </div>

      {/* Leaders section */}
      {hasData && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl leading-none">
              {playerEmojis[leastGuessesPlayer.id] ?? leastGuessesPlayer.defaultEmoji}
            </span>
            <p className="mt-2 text-s font-semibold text-gray-700">{leastGuessesPlayer.name}</p>
            <p className="text-xs text-gray-500">Fewest Guesses</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl leading-none">
              {playerEmojis[mostPointsPlayer.id] ?? mostPointsPlayer.defaultEmoji}
            </span>
            <p className="mt-2 text-s font-semibold text-gray-700">{mostPointsPlayer.name}</p>
            <p className="text-xs text-gray-500">Most Points</p>
          </div>
        </div>
      )}

      {/* Totals table */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-center font-medium text-gray-500">Guesses</th>
              <th className="pb-1 text-center font-medium text-gray-500">Points</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const isWinner = stats.overallWinnerIds.includes(player.id)
              return (
                <tr key={player.id} className={`border-b border-gray-100 ${isWinner && hasData ? 'bg-amber-50' : ''}`}>
                  <td className="py-2 font-medium text-gray-900">{getPlayerDisplay(player.id)}</td>
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base font-bold text-gray-900">{stats.guesserScore[player.id]}</span>
                      {isWinner && hasData && <span>🏆</span>}
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base font-bold text-gray-900">{stats.wordSetterScore[player.id]}</span>
                      {player.id === mostPointsPlayer.id && hasData && <span>🏆</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Guesses:</span>
          <span>Total guesses you made to solve everyone else&apos;s words (lower is better).</span>
          <span className="font-semibold text-gray-700">Points:</span>
          <span>Total guesses others made on your words. Your words were harder to crack (higher is better).</span>
        </div>
      </div>

      {/* Per-day history table */}
      {stats.dayStats.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setHistoryView('guesses')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${historyView === 'guesses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Guesses
            </button>
            <button
              type="button"
              onClick={() => setHistoryView('points')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${historyView === 'points' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Points
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="pb-1 text-left font-medium">Day</th>
                {CONFIG.players.map((player) => (
                  <th key={player.id} className="pb-1 text-center font-medium">
                    {getPlayerDisplay(player.id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.dayStats.map((day) => {
                const scores = historyView === 'guesses' ? day.guesserScore : day.wordSetterScore
                const values = CONFIG.players.map((p) => scores[p.id] ?? 0)
                const bestValue =
                  historyView === 'guesses' ? Math.min(...values) : Math.max(...values)
                return (
                  <tr key={day.date} className="border-b border-gray-100">
                    <td className="py-2 text-xs text-gray-500">{formatDate(day.date)}</td>
                    {CONFIG.players.map((player) => {
                      const value = scores[player.id] ?? 0
                      const isBest = value === bestValue
                      return (
                        <td key={player.id} className="py-2 text-center">
                          <span className={`text-sm font-bold ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                            {value}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


