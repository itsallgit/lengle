import { useEffect, useState } from 'react'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { listS3Keys, readJson } from '../../lib/s3'
import type { DayResults, PlayerGuesses, PuzzleWord } from '../../types'
import Header from '../shared/Header'
import DayEntry from './DayEntry'

export interface DayHistoryData {
  date: string
  words: Record<string, PuzzleWord | null>        // setter_id → word
  guesses: Record<string, PlayerGuesses | null>   // guesser_id → guesses
  results: DayResults | null
}

export default function WordHistory() {
  const [history, setHistory] = useState<DayHistoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const activePuzzleDate = getActivePuzzleDate()

      // List all day keys to find known past dates (AC-14: exclude current day)
      const dayKeys = await listS3Keys('data/days/')
      const dateSet = new Set<string>()
      for (const key of dayKeys) {
        const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\//)
        if (match) {
          const d = match[1]
          // AC-14: only show dates strictly before the active puzzle date
          if (d < activePuzzleDate) dateSet.add(d)
        }
      }

      const pastDates = Array.from(dateSet).sort().reverse() // newest first

      if (pastDates.length === 0) {
        setLoading(false)
        return
      }

      // Fetch words, guesses, and results for all past dates in parallel
      const dayData = await Promise.all(
        pastDates.map(async (date) => {
          // All three word files + all three guess files + results file
          const [wordsArr, guessesArr, results] = await Promise.all([
            Promise.all(
              CONFIG.players.map((setter) =>
                readJson<PuzzleWord>(
                  `data/words/${date}/${setter.id}.json`,
                ).then((pw) => [setter.id, pw] as const),
              ),
            ),
            Promise.all(
              CONFIG.players.map((guesser) =>
                readJson<PlayerGuesses>(
                  `data/days/${date}/guesses-${guesser.id}.json`,
                ).then((pg) => [guesser.id, pg] as const),
              ),
            ),
            readJson<DayResults>(`data/days/${date}/results.json`),
          ])

          return {
            date,
            words: Object.fromEntries(wordsArr) as Record<
              string,
              PuzzleWord | null
            >,
            guesses: Object.fromEntries(guessesArr) as Record<
              string,
              PlayerGuesses | null
            >,
            results,
          } satisfies DayHistoryData
        }),
      )

      setHistory(dayData)
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="mb-4 text-2xl font-black text-gray-900">Word History</h1>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && history.length === 0 && (
          <p className="text-sm text-gray-500">
            No past puzzle days yet — history appears here after the first
            puzzle day has ended.
          </p>
        )}

        <div className="space-y-3">
          {history.map((day) => (
            <DayEntry key={day.date} day={day} />
          ))}
        </div>
      </div>
    </div>
  )
}
