import { useEffect } from 'react'
import { CONFIG } from '../lib/config'
import { getPreviousPuzzleDate } from '../lib/date'
import { readJson, writeToS3 } from '../lib/s3'
import type { DayResults, PlayerGuesses, PlayerResult, PuzzleWinner } from '../types'

/**
 * Derives DayResults from raw guess files for the given date.
 *
 * Rules (from spec §6):
 * - Per-puzzle winner: solver with fewest guesses; ties → joint winners.
 * - Daily winner: lowest total guesses across both puzzles, only for players
 *   who solved both; ties → joint winners.
 * - Players with no guess file are treated as having solved 0 puzzles.
 */
function computeResults(
  date: string,
  allGuesses: (PlayerGuesses | null)[],
): DayResults {
  const validGuesses = allGuesses.filter((g): g is PlayerGuesses => g !== null)

  // ── Puzzle winners ────────────────────────────────────────────────────────
  const puzzleWinners: PuzzleWinner[] = []

  for (const setter of CONFIG.players) {
    const solvers: Array<{ guesser_id: string; count: number }> = []

    for (const pg of validGuesses) {
      if (pg.guesser_id === setter.id) continue // can't win your own puzzle
      const forPuzzle = pg.guesses.filter(g => g.puzzle_setter_id === setter.id)
      if (forPuzzle.some(g => g.is_correct)) {
        solvers.push({ guesser_id: pg.guesser_id, count: forPuzzle.length })
      }
    }

    if (solvers.length > 0) {
      const minCount = Math.min(...solvers.map(s => s.count))
      puzzleWinners.push({
        setter_id: setter.id,
        winner_ids: solvers
          .filter(s => s.count === minCount)
          .map(s => s.guesser_id),
        winning_guess_count: minCount,
      })
    }
  }

  // ── Per-player totals ─────────────────────────────────────────────────────
  const playerResults: PlayerResult[] = CONFIG.players.map(player => {
    const pg = validGuesses.find(g => g.guesser_id === player.id)
    const otherSetters = CONFIG.players.filter(p => p.id !== player.id)

    let totalGuesses = 0
    let puzzlesSolved = 0

    for (const setter of otherSetters) {
      const forPuzzle = pg
        ? pg.guesses.filter(g => g.puzzle_setter_id === setter.id)
        : []
      totalGuesses += forPuzzle.length
      if (forPuzzle.some(g => g.is_correct)) {
        puzzlesSolved++
      }
    }

    return {
      player_id: player.id,
      total_guesses: totalGuesses,
      puzzles_solved: puzzlesSolved,
      is_daily_winner: false, // resolved below
    }
  })

  // ── Daily winner ──────────────────────────────────────────────────────────
  const fullyCompleted = playerResults.filter(r => r.puzzles_solved === 2)
  if (fullyCompleted.length > 0) {
    const minGuesses = Math.min(...fullyCompleted.map(r => r.total_guesses))
    for (const r of playerResults) {
      if (r.puzzles_solved === 2 && r.total_guesses === minGuesses) {
        r.is_daily_winner = true
      }
    }
  }

  return {
    date,
    finalised_at: new Date().toISOString(),
    player_results: playerResults,
    puzzle_winners: puzzleWinners,
  }
}

/**
 * Runs once on app mount (AC-20).
 *
 * Checks whether the previous puzzle day's results file exists. If not,
 * reads all three per-player guess files, computes results, and writes
 * results.json. The computation is idempotent — last-write-wins is safe
 * because all clients derive the same output from the same input.
 */
export function useResultsFinalisation(): void {
  useEffect(() => {
    void (async () => {
      try {
        const prevDate = getPreviousPuzzleDate()
        const resultsKey = `data/days/${prevDate}/results.json`

        const existing = await readJson<DayResults>(resultsKey)
        if (existing !== null) return // already finalised

        // Fetch all three guess files in parallel; missing files return null.
        const guessFiles = await Promise.all(
          CONFIG.players.map(p =>
            readJson<PlayerGuesses>(
              `data/days/${prevDate}/guesses-${p.id}.json`,
            ),
          ),
        )

        const results = computeResults(prevDate, guessFiles)
        await writeToS3(resultsKey, results)
      } catch {
        // Finalisation is best-effort; errors are silently ignored so a
        // temporary S3 outage or missing credentials during development
        // never blocks the rest of the app.
      }
    })()
  }, [])
}
