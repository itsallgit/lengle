import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { readJson } from '../../lib/s3'
import type { DayResults, PlayerGuesses, PuzzleWord } from '../../types'

interface PuzzleStats {
  setterId: string
  setterName: string
  setterDisplay: string
  guessCounts: Record<string, number | null>
  winnerIds: string[]
  word: string | null
  allSolved: boolean
}

interface TodayData {
  results: DayResults | null
  playerGuesses: Record<string, PlayerGuesses | null>
  puzzleWords: Record<string, string | null>
}

/** Simple green-tile word display, matching WordHistory style. */
function WordTilesDisplay({ word }: { word: string }) {
  return (
    <div className="my-2 flex gap-1">
      {word.split('').map((letter, i) => (
        <div
          key={i}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-sm font-bold text-white"
        >
          {letter}
        </div>
      ))}
    </div>
  )
}

/** Five grey question-mark tiles shown before a puzzle is fully solved. */
function HiddenWordDisplay() {
  return (
    <div className="my-2 flex gap-1">
      {Array.from({ length: CONFIG.wordLength }).map((_, i) => (
        <div
          key={i}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-300 text-sm font-bold text-gray-500"
        >
          ?
        </div>
      ))}
    </div>
  )
}

/** Single small grey tile with "?" used in table cells for unsolved/unknown values. */
function GreyQuestionTile() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-500 text-xs font-bold text-white">
      ?
    </span>
  )
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
      const results = await readJson<DayResults>(
        `data/days/${date}/results.json`,
      )

      const [guessEntries, wordEntries] = await Promise.all([
        Promise.all(
          CONFIG.players.map(async (p) => {
            const pg = await readJson<PlayerGuesses>(
              `data/days/${date}/guesses-${p.id}.json`,
            )
            return [p.id, pg] as const
          }),
        ),
        Promise.all(
          CONFIG.players.map(async (p) => {
            const pw = await readJson<PuzzleWord>(
              `data/words/${date}/${p.id}.json`,
            )
            return [p.id, pw?.word ?? null] as const
          }),
        ),
      ])

      const playerGuesses = Object.fromEntries(guessEntries) as Record<
        string,
        PlayerGuesses | null
      >
      const puzzleWords = Object.fromEntries(wordEntries) as Record<
        string,
        string | null
      >

      setData({ results, playerGuesses, puzzleWords })
      setLoading(false)
    }
    void load()
  }, [date])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  const { results, playerGuesses, puzzleWords } = data!

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

    const allSolved = Object.values(guessCounts).every((c) => c !== null)

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
      word: allSolved ? (puzzleWords[setter.id] ?? null) : null,
      allSolved,
    }
  })

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

  const completedPlayers = dailyTotals.filter((d) => d.solved === 2)
  let dailyWinnerIds: string[] = []
  if (completedPlayers.length > 0) {
    const min = Math.min(...completedPlayers.map((d) => d.total))
    dailyWinnerIds = completedPlayers
      .filter((d) => d.total === min)
      .map((d) => d.playerId)
  }

  const finalisedWinnerIds = results
    ? results.player_results
        .filter((r) => r.is_daily_winner)
        .map((r) => r.player_id)
    : dailyWinnerIds

  const allPlayersCompleted = dailyTotals.every((d) => d.solved === 2)

  // Compute most-points setter: sum guesses made on each player's word
  const pointsPerSetter: Record<string, number> = {}
  for (const puzzle of puzzleStats) {
    pointsPerSetter[puzzle.setterId] = Object.values(puzzle.guessCounts)
      .filter((c): c is number => c !== null)
      .reduce((sum, c) => sum + c, 0)
  }
  const maxPoints = Math.max(...CONFIG.players.map((p) => pointsPerSetter[p.id] ?? 0))
  const mostPointsEntry = CONFIG.players.find((p) => (pointsPerSetter[p.id] ?? 0) === maxPoints) ?? CONFIG.players[0]
  const fewestGuessesEntry = CONFIG.players.find((p) => p.id === finalisedWinnerIds[0]) ?? CONFIG.players[0]

  return (
    <div className="space-y-6">
      {/* Leaders section — shown when all players have completed; else show waiting message */}
      {allPlayersCompleted && finalisedWinnerIds.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl leading-none">
              {playerEmojis[fewestGuessesEntry.id] ?? fewestGuessesEntry.defaultEmoji}
            </span>
            <p className="mt-2 text-s font-semibold text-gray-700">{fewestGuessesEntry.name}</p>
            <p className="text-xs text-gray-500">Fewest Guesses</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl leading-none">
              {playerEmojis[mostPointsEntry.id] ?? mostPointsEntry.defaultEmoji}
            </span>
            <p className="mt-2 text-s font-semibold text-gray-700">{mostPointsEntry.name}</p>
            <p className="text-xs text-gray-500">Most Points</p>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Not all players have completed today&apos;s puzzles
        </p>
      )}

      {/* Daily Scores table */}
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
            {[...dailyTotals].sort((a, b) => {
              const aComplete = a.solved === (CONFIG.players.length - 1)
              const bComplete = b.solved === (CONFIG.players.length - 1)
              if (aComplete && !bComplete) return -1
              if (!aComplete && bComplete) return 1
              return a.total - b.total
            }).map((row) => {
              const isGuessesWinner = finalisedWinnerIds.includes(row.playerId)
              const isPointsWinner = allPlayersCompleted && row.playerId === mostPointsEntry.id
              const allSolved = row.solved === (CONFIG.players.length - 1)
              return (
                <tr
                  key={row.playerId}
                  className={`border-b border-gray-100 ${isGuessesWinner && allPlayersCompleted ? 'bg-amber-50' : ''}`}
                >
                  <td className="py-2 font-medium text-gray-900">
                    {row.playerDisplay}
                  </td>
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {allSolved
                        ? <span className="text-base font-bold text-gray-900">{row.total}</span>
                        : <GreyQuestionTile />}
                      {isGuessesWinner && allPlayersCompleted && <span>🏆</span>}
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base font-bold text-gray-900">{pointsPerSetter[row.playerId] ?? 0}</span>
                      {isPointsWinner && <span>🏆</span>}
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

      {/* Per-puzzle sections */}
      {puzzleStats.map((puzzle) => (
        <div
          key={puzzle.setterId}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <h2 className="mb-1 text-sm font-bold text-gray-900">
            {puzzle.setterDisplay}&apos;s Puzzle
          </h2>

          {/* Word tile reveal */}
          {puzzle.allSolved && puzzle.word ? (
            <WordTilesDisplay word={puzzle.word} />
          ) : (
            <HiddenWordDisplay />
          )}

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
                    <tr
                      key={guesser.id}
                      className={`border-b border-gray-100 ${isWinner ? 'bg-amber-50' : ''}`}
                    >
                      <td className="py-2 font-medium text-gray-900">
                        {getPlayerDisplay(guesser.id)}
                      </td>
                      <td className="py-2 text-right">
                        {count !== null ? <span className="text-base font-bold text-gray-900">{count}</span> : <GreyQuestionTile />}
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

      <p className="text-xs text-gray-400">
        Updates as players complete puzzles throughout the day.
      </p>
    </div>
  )
}
