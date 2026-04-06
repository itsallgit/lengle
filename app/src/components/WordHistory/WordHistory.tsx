import { useEffect, useState } from 'react'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { listS3Keys, readJson } from '../../lib/s3'
import type { PlayerGuesses, PuzzleWord } from '../../types'
import Header from '../shared/Header'
import WordHistoryDay from './DayEntry'

export interface PuzzleData {
  setterId: string
  word: string | null
  allFinished: boolean
  guesserResults: { playerId: string; guessCount: number | null }[]
}

export interface DayData {
  allCompleted: boolean
  puzzles: PuzzleData[]
}

export default function WordHistory() {
  const [pastDates, setPastDates] = useState<string[]>([])
  const [loadedData, setLoadedData] = useState<Record<string, DayData | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const activePuzzleDate = getActivePuzzleDate()

      const dayKeys = await listS3Keys('data/days/')
      const dateSet = new Set<string>()
      for (const key of dayKeys) {
        const match = key.match(/data\/days\/(\d{4}-\d{2}-\d{2})\/guesses-/)
        if (match && match[1] <= activePuzzleDate) {
          dateSet.add(match[1])
        }
      }
      // Always include today even if no guesses have been submitted yet
      dateSet.add(activePuzzleDate)

      const dates = Array.from(dateSet).sort().reverse()
      setPastDates(dates)

      if (dates.length === 0) {
        setLoading(false)
        return
      }

      const allDayData = await Promise.all(
        dates.map(async (date) => {
          const [wordsArr, guessesArr] = await Promise.all([
            Promise.all(
              CONFIG.players.map((p) =>
                readJson<PuzzleWord>(`data/words/${date}/${p.id}.json`).then(
                  (pw) => [p.id, pw] as const,
                ),
              ),
            ),
            Promise.all(
              CONFIG.players.map((p) =>
                readJson<PlayerGuesses>(`data/days/${date}/guesses-${p.id}.json`).then(
                  (pg) => [p.id, pg] as const,
                ),
              ),
            ),
          ])

          const words = Object.fromEntries(wordsArr) as Record<string, PuzzleWord | null>
          const guesses = Object.fromEntries(guessesArr) as Record<string, PlayerGuesses | null>

          // Build puzzle data per setter
          const puzzles: PuzzleData[] = CONFIG.players.map((setter) => {
            const nonSetters = CONFIG.players.filter((p) => p.id !== setter.id)

            const guesserResults = nonSetters.map((guesser) => {
              const pg = guesses[guesser.id]
              if (!pg) return { playerId: guesser.id, guessCount: null }
              const forPuzzle = pg.guesses.filter((g) => g.puzzle_setter_id === setter.id)
              const solved = forPuzzle.some((g) => g.is_correct)
              return {
                playerId: guesser.id,
                guessCount: solved ? forPuzzle.length : null,
              }
            })

            const allFinished = guesserResults.every((r) => r.guessCount !== null)

            return {
              setterId: setter.id,
              word: allFinished ? (words[setter.id]?.word ?? null) : null,
              allFinished,
              guesserResults,
            }
          })

          // Day is all completed if every puzzle is allFinished
          const allCompleted = puzzles.every((p) => p.allFinished)

          return { date, dayData: { allCompleted, puzzles } }
        }),
      )

      const dataMap: Record<string, DayData> = {}
      for (const { date, dayData } of allDayData) {
        dataMap[date] = dayData
      }

      setLoadedData(dataMap)
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-2">

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && pastDates.length === 0 && (
          <p className="text-sm text-gray-500">No puzzle days yet.</p>
        )}

        {pastDates.map((date) => (
          <WordHistoryDay
            key={date}
            date={date}
            dayData={loadedData[date] ?? null}
          />
        ))}
      </main>
    </div>
  )
}

