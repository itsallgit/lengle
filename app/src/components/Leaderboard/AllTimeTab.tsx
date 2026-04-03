import { useEffect, useState } from 'react'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { listS3Keys, readJson } from '../../lib/s3'
import type { DayResults, PlayerGuesses } from '../../types'

function getPlayerName(id: string): string {
  return CONFIG.players.find((p) => p.id === id)?.name ?? id
}

interface AllTimeStats {
  totalWins: Record<string, number>
  longestStreak: Record<string, number>
  currentStreak: Record<string, number>
  avgGuessesPerPuzzle: Record<string, number>
  bestSetter: { playerId: string; avg: number } | null
  sharpestGuesser: { playerId: string; avg: number } | null
}

/**
 * Derives a sorted list of past puzzle dates from S3 key listing.
 * Only dates strictly before the active puzzle date are counted as past.
 */
function extractPastDates(keys: string[], activePuzzleDate: string): string[] {
  const dateSet = new Set<string>()
  for (const key of keys) {
    // keys look like: data/days/2026-03-30/status.json
    const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\//)
    if (match) {
      const d = match[1]
      if (d < activePuzzleDate) dateSet.add(d)
    }
  }
  return Array.from(dateSet).sort()
}

/**
 * Computes the longest and current consecutive win streak for each player.
 * A player "wins" a day if is_daily_winner is true in that day's results.
 */
function computeStreaks(
  sortedDates: string[],
  resultsByDate: Record<string, DayResults | null>,
): { longest: Record<string, number>; current: Record<string, number> } {
  const longest: Record<string, number> = {}
  const current: Record<string, number> = {}
  const running: Record<string, number> = {}

  for (const p of CONFIG.players) {
    longest[p.id] = 0
    current[p.id] = 0
    running[p.id] = 0
  }

  for (const date of sortedDates) {
    const results = resultsByDate[date]
    for (const p of CONFIG.players) {
      const won =
        results?.player_results.find((r) => r.player_id === p.id)
          ?.is_daily_winner ?? false
      if (won) {
        running[p.id]++
        if (running[p.id] > longest[p.id]) longest[p.id] = running[p.id]
      } else {
        running[p.id] = 0
      }
    }
  }

  // Current streak = the running count at the end of history
  for (const p of CONFIG.players) {
    current[p.id] = running[p.id]
  }

  return { longest, current }
}

export default function AllTimeTab() {
  const [stats, setStats] = useState<AllTimeStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const activePuzzleDate = getActivePuzzleDate()

      // List all day keys to derive past dates
      const dayKeys = await listS3Keys('data/days/')
      const wordKeys = await listS3Keys('data/words/')
      const pastDates = extractPastDates(dayKeys, activePuzzleDate)

      if (pastDates.length === 0) {
        setStats({
          totalWins: Object.fromEntries(CONFIG.players.map((p) => [p.id, 0])),
          longestStreak: Object.fromEntries(
            CONFIG.players.map((p) => [p.id, 0]),
          ),
          currentStreak: Object.fromEntries(
            CONFIG.players.map((p) => [p.id, 0]),
          ),
          avgGuessesPerPuzzle: Object.fromEntries(
            CONFIG.players.map((p) => [p.id, 0]),
          ),
          bestSetter: null,
          sharpestGuesser: null,
        })
        setLoading(false)
        return
      }

      // Fetch results and all word files for past dates in parallel
      const [resultsList, ...playerGuessesNested] = await Promise.all([
        Promise.all(
          pastDates.map((d) =>
            readJson<DayResults>(`data/days/${d}/results.json`),
          ),
        ),
        ...CONFIG.players.map((player) =>
          Promise.all(
            pastDates.map((d) =>
              readJson<PlayerGuesses>(
                `data/days/${d}/guesses-${player.id}.json`,
              ),
            ),
          ),
        ),
      ])

      const resultsByDate: Record<string, DayResults | null> = {}
      for (let i = 0; i < pastDates.length; i++) {
        resultsByDate[pastDates[i]] = resultsList[i]
      }

      // guessesPerPlayer[playerIndex][dateIndex]
      const guessesPerPlayer = playerGuessesNested as (PlayerGuesses | null)[][]

      // ── Total wins ────────────────────────────────────────────────────────
      const totalWins: Record<string, number> = Object.fromEntries(
        CONFIG.players.map((p) => [p.id, 0]),
      )
      for (const results of Object.values(resultsByDate)) {
        if (!results) continue
        for (const r of results.player_results) {
          if (r.is_daily_winner) totalWins[r.player_id] = (totalWins[r.player_id] ?? 0) + 1
        }
      }

      // ── Streaks ───────────────────────────────────────────────────────────
      const { longest: longestStreak, current: currentStreak } =
        computeStreaks(pastDates, resultsByDate)

      // ── Average guesses per puzzle (sharpest guesser) ─────────────────────
      const guesserTotals: Record<string, { total: number; count: number }> =
        Object.fromEntries(
          CONFIG.players.map((p) => [p.id, { total: 0, count: 0 }]),
        )

      for (let pi = 0; pi < CONFIG.players.length; pi++) {
        const player = CONFIG.players[pi]
        for (let di = 0; di < pastDates.length; di++) {
          const pg = guessesPerPlayer[pi][di]
          if (!pg) continue
          const otherSetters = CONFIG.players.filter((p) => p.id !== player.id)
          for (const setter of otherSetters) {
            const forPuzzle = pg.guesses.filter(
              (g) => g.puzzle_setter_id === setter.id,
            )
            if (forPuzzle.some((g) => g.is_correct)) {
              guesserTotals[player.id].total += forPuzzle.length
              guesserTotals[player.id].count++
            }
          }
        }
      }

      const avgGuessesPerPuzzle: Record<string, number> = Object.fromEntries(
        CONFIG.players.map((p) => [
          p.id,
          guesserTotals[p.id].count > 0
            ? guesserTotals[p.id].total / guesserTotals[p.id].count
            : 0,
        ]),
      )

      const qualifiedGuessers = CONFIG.players.filter(
        (p) => guesserTotals[p.id].count > 0,
      )
      const sharpestGuesser =
        qualifiedGuessers.length > 0
          ? qualifiedGuessers.reduce((best, p) =>
              avgGuessesPerPuzzle[p.id] < avgGuessesPerPuzzle[best.id]
                ? p
                : best,
            )
          : null

      // ── Best setter (words that required most average guesses) ────────────
      // Fetch word files for past dates so we can map by word; but we derive
      // setter difficulty purely from guess outcomes per setter_id.
      const setterTotals: Record<string, { total: number; count: number }> =
        Object.fromEntries(
          CONFIG.players.map((p) => [p.id, { total: 0, count: 0 }]),
        )

      for (let pi = 0; pi < CONFIG.players.length; pi++) {
        const player = CONFIG.players[pi]
        for (let di = 0; di < pastDates.length; di++) {
          const pg = guessesPerPlayer[pi][di]
          if (!pg) continue
          const otherSetters = CONFIG.players.filter((p) => p.id !== player.id)
          for (const setter of otherSetters) {
            const forPuzzle = pg.guesses.filter(
              (g) => g.puzzle_setter_id === setter.id,
            )
            if (forPuzzle.some((g) => g.is_correct)) {
              setterTotals[setter.id].total += forPuzzle.length
              setterTotals[setter.id].count++
            }
          }
        }
      }

      const qualifiedSetters = CONFIG.players.filter(
        (p) => setterTotals[p.id].count > 0,
      )
      const bestSetter =
        qualifiedSetters.length > 0
          ? qualifiedSetters.reduce((hardest, p) => {
              const avgP = setterTotals[p.id].total / setterTotals[p.id].count
              const avgH =
                setterTotals[hardest.id].total / setterTotals[hardest.id].count
              return avgP > avgH ? p : hardest
            })
          : null

      // Suppress unused variable warning for wordKeys (fetched for future use)
      void wordKeys

      setStats({
        totalWins,
        longestStreak,
        currentStreak,
        avgGuessesPerPuzzle,
        bestSetter: bestSetter
          ? {
              playerId: bestSetter.id,
              avg:
                setterTotals[bestSetter.id].total /
                setterTotals[bestSetter.id].count,
            }
          : null,
        sharpestGuesser: sharpestGuesser
          ? {
              playerId: sharpestGuesser.id,
              avg: avgGuessesPerPuzzle[sharpestGuesser.id],
            }
          : null,
      })
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Awards */}
      <div className="space-y-2">
        {stats.bestSetter && (
          <div className="rounded-md bg-gray-50 px-4 py-3 text-sm">
            <span className="mr-2">🏆</span>
            <span className="font-semibold">Best Setter:</span>{' '}
            {getPlayerName(stats.bestSetter.playerId)}{' '}
            <span className="text-gray-500">
              ({stats.bestSetter.avg.toFixed(1)} avg guesses required)
            </span>
          </div>
        )}
        {stats.sharpestGuesser && (
          <div className="rounded-md bg-gray-50 px-4 py-3 text-sm">
            <span className="mr-2">🎯</span>
            <span className="font-semibold">Sharpest Guesser:</span>{' '}
            {getPlayerName(stats.sharpestGuesser.playerId)}{' '}
            <span className="text-gray-500">
              ({stats.sharpestGuesser.avg.toFixed(1)} avg guesses per puzzle)
            </span>
          </div>
        )}
      </div>

      {/* Summary table */}
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-right font-medium">Daily Wins</th>
              <th className="pb-1 text-right font-medium">
                🔥 Best Streak
              </th>
              <th className="pb-1 text-right font-medium">
                📅 Current Streak
              </th>
            </tr>
          </thead>
          <tbody>
            {CONFIG.players.map((player) => (
              <tr key={player.id} className="border-b border-gray-100">
                <td className="py-2 font-medium text-gray-900">
                  {player.name}
                </td>
                <td className="py-2 text-right text-gray-700">
                  {stats.totalWins[player.id] ?? 0}
                </td>
                <td className="py-2 text-right text-gray-700">
                  {stats.longestStreak[player.id] ?? 0}
                </td>
                <td className="py-2 text-right text-gray-700">
                  {stats.currentStreak[player.id] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Avg guesses per puzzle */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Average Guesses per Puzzle (solved only)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="pb-1 font-medium">Player</th>
              <th className="pb-1 text-right font-medium">Avg</th>
            </tr>
          </thead>
          <tbody>
            {CONFIG.players.map((player) => (
              <tr key={player.id} className="border-b border-gray-100">
                <td className="py-2 font-medium text-gray-900">
                  {player.name}
                </td>
                <td className="py-2 text-right text-gray-700">
                  {stats.avgGuessesPerPuzzle[player.id] > 0
                    ? stats.avgGuessesPerPuzzle[player.id].toFixed(1)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
