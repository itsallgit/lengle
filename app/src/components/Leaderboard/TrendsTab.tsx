import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { listS3Keys, readJson } from '../../lib/s3'
import type { PlayerGuesses, PuzzleWord } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type PlayerFilter = 'all' | string          // string = player_id
type DateRange = '7' | '30' | 'all'

interface DayRow {
  date: string
  // per-player: guess score for each individual guess in order
  guessScores: Record<string, number[]>
  // per-player daily total
  dailyTotal: Record<string, number>
}

interface WordDifficulty {
  word: string
  setterName: string
  avgGuesses: number
}

const PLAYER_COLORS: Record<string, string> = {
  player_1: '#3b82f6',
  player_2: '#10b981',
  player_3: '#f59e0b',
}

function getPlayerName(id: string): string {
  return CONFIG.players.find((p) => p.id === id)?.name ?? id
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

function applyDateRange<T>(items: T[], range: DateRange): T[] {
  if (range === 'all') return items
  const n = Number(range)
  return items.slice(-n)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrendsTab() {
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const [dayRows, setDayRows] = useState<DayRow[]>([])
  const [wordDifficulty, setWordDifficulty] = useState<WordDifficulty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const activePuzzleDate = getActivePuzzleDate()
      const dayKeys = await listS3Keys('data/days/')
      const wordKeys = await listS3Keys('data/words/')
      const pastDates = extractPastDates(dayKeys, activePuzzleDate)

      if (pastDates.length === 0) {
        setLoading(false)
        return
      }

      // Fetch all players' guess files for all past dates
      const guessesMatrix = await Promise.all(
        CONFIG.players.map((player) =>
          Promise.all(
            pastDates.map((d) =>
              readJson<PlayerGuesses>(
                `data/days/${d}/guesses-${player.id}.json`,
              ),
            ),
          ),
        ),
      )
      // guessesMatrix[playerIndex][dateIndex]

      // Build DayRow array
      const rows: DayRow[] = pastDates.map((date, di) => {
        const guessScores: Record<string, number[]> = {}
        const dailyTotal: Record<string, number> = {}

        for (let pi = 0; pi < CONFIG.players.length; pi++) {
          const player = CONFIG.players[pi]
          const pg = guessesMatrix[pi][di]
          if (!pg) {
            guessScores[player.id] = []
            dailyTotal[player.id] = 0
            continue
          }
          guessScores[player.id] = pg.guesses.map((g) => g.score)
          dailyTotal[player.id] = pg.guesses.length
        }

        return { date, guessScores, dailyTotal }
      })
      setDayRows(rows)

      // Fetch word files for past dates to build word difficulty
      const wordDates = extractPastDates(wordKeys, activePuzzleDate)
      const wordData = await Promise.all(
        wordDates.flatMap((d) =>
          CONFIG.players.map((setter) =>
            readJson<PuzzleWord>(
              `data/words/${d}/${setter.id}.json`,
            ).then((pw) => ({ date: d, setterId: setter.id, pw })),
          ),
        ),
      )

      // Compute average guesses per word
      const difficultyMap: Record<
        string,
        { word: string; setterName: string; total: number; count: number }
      > = {}

      for (const { date, setterId, pw } of wordData) {
        if (!pw) continue
        const key = `${date}__${setterId}`
        const di = pastDates.indexOf(date)
        if (di === -1) continue

        let totalGuesses = 0
        let solvers = 0
        for (let pi = 0; pi < CONFIG.players.length; pi++) {
          const player = CONFIG.players[pi]
          if (player.id === setterId) continue
          const pg = guessesMatrix[pi][di]
          if (!pg) continue
          const forPuzzle = pg.guesses.filter(
            (g) => g.puzzle_setter_id === setterId,
          )
          if (forPuzzle.some((g) => g.is_correct)) {
            totalGuesses += forPuzzle.length
            solvers++
          }
        }

        difficultyMap[key] = {
          word: pw.word,
          setterName: getPlayerName(setterId),
          total: totalGuesses,
          count: solvers,
        }
      }

      const difficulty: WordDifficulty[] = Object.values(difficultyMap)
        .filter((d) => d.count > 0)
        .map((d) => ({
          word: d.word,
          setterName: d.setterName,
          avgGuesses: d.total / d.count,
        }))
        .sort((a, b) => b.avgGuesses - a.avgGuesses)
        .slice(0, 20) // cap to top 20 hardest words

      setWordDifficulty(difficulty)
      setLoading(false)
    }
    void load()
  }, [])

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredRows = useMemo(
    () => applyDateRange(dayRows, dateRange),
    [dayRows, dateRange],
  )

  const visiblePlayers = useMemo(
    () =>
      playerFilter === 'all'
        ? CONFIG.players
        : CONFIG.players.filter((p) => p.id === playerFilter),
    [playerFilter],
  )

  // Chart 1: guess score per individual guess over time (one line per player)
  // Each data point = one guess (indexed across all time, grouped by player date)
  // We show up to the most recent 100 guesses per player for readability.
  const guessScoreData = useMemo(() => {
    type Point = { index: number } & Record<string, number | undefined>
    const byPlayer: Record<string, number[]> = {}
    for (const p of visiblePlayers) {
      byPlayer[p.id] = []
    }
    for (const row of filteredRows) {
      for (const p of visiblePlayers) {
        for (const score of row.guessScores[p.id] ?? []) {
          byPlayer[p.id].push(score)
        }
      }
    }
    // Find max length
    const maxLen = Math.max(0, ...Object.values(byPlayer).map((arr) => arr.length))
    const points: Point[] = []
    for (let i = 0; i < maxLen; i++) {
      const pt: Point = { index: i + 1 }
      for (const p of visiblePlayers) {
        const arr = byPlayer[p.id]
        if (i < arr.length) pt[p.id] = arr[i]
      }
      points.push(pt)
    }
    return points
  }, [filteredRows, visiblePlayers])

  // Chart 2: daily total guess count per player
  const dailyTotalData = useMemo(
    () =>
      filteredRows.map((row) => {
        const pt: Record<string, number | string> = { date: row.date.slice(5) } // MM-DD
        for (const p of visiblePlayers) {
          pt[p.id] = row.dailyTotal[p.id] ?? 0
        }
        return pt
      }),
    [filteredRows, visiblePlayers],
  )

  // Chart 3: word difficulty bar chart (not filtered by player/date — all time)
  const difficultyData = useMemo(
    () =>
      wordDifficulty.map((d) => ({
        label: `${d.word} (${d.setterName})`,
        avgGuesses: parseFloat(d.avgGuesses.toFixed(1)),
      })),
    [wordDifficulty],
  )

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  if (dayRows.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No past puzzle data yet — check back after the first day completes.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Filter controls ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="player-filter"
            className="text-xs font-medium text-gray-500"
          >
            Player
          </label>
          <select
            id="player-filter"
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value as PlayerFilter)}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All Players</option>
            {CONFIG.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-range"
            className="text-xs font-medium text-gray-500"
          >
            Date Range
          </label>
          <select
            id="date-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* ── Chart 1: Per-guess score over time ────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Guess Score per Individual Guess
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Each point is one guess in chronological order. Lower scores mean
          faster deduction.
        </p>
        {guessScoreData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={guessScoreData}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="index"
                tick={{ fontSize: 10 }}
                label={{ value: 'Guess #', position: 'insideBottom', offset: -2, fontSize: 10 }}
              />
              <YAxis
                domain={[0, 15]}
                tick={{ fontSize: 10 }}
                label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {visiblePlayers.map((p) => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.id}
                  name={getPlayerName(p.id)}
                  stroke={PLAYER_COLORS[p.id] ?? '#6b7280'}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-gray-400">No data for selected filters.</p>
        )}
      </div>

      {/* ── Chart 2: Daily total guess count ──────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Daily Total Guess Count
        </h2>
        {dailyTotalData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={dailyTotalData}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {visiblePlayers.map((p) => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.id}
                  name={getPlayerName(p.id)}
                  stroke={PLAYER_COLORS[p.id] ?? '#6b7280'}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-gray-400">No data for selected filters.</p>
        )}
      </div>

      {/* ── Chart 3: Hardest words bar chart (all time, no player filter) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Hardest Words (avg guesses required — all time)
        </h2>
        {difficultyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, difficultyData.length * 24)}>
            <BarChart
              data={difficultyData}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Bar dataKey="avgGuesses" name="Avg Guesses" fill="#6b7280" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-gray-400">No solved puzzles yet.</p>
        )}
      </div>
    </div>
  )
}
