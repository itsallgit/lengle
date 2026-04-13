import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate, getTomorrowPuzzleDate } from '../../lib/date'
import { readJson, writeToS3 } from '../../lib/s3'
import type { DayStatus, PuzzleWord } from '../../types'
import Header from '../shared/Header'
import WordSetForm from '../Lobby/WordSetForm'
import PuzzlePanel from './PuzzlePanel'

export default function PuzzleView() {
  const { playerId } = usePlayer()

  // Compute the active puzzle date once at mount so both panels always use the
  // same date value even if the clock crosses 4am while the view is open.
  const [date] = useState(() => getActivePuzzleDate())
  const tomorrowDate = getTomorrowPuzzleDate()

  // Fetch the current player's own word once and pass it to both panels for
  // AC-01 validation (a player cannot guess their own puzzle word).
  const [ownWord, setOwnWord] = useState<string | null>(null)
  const [tomorrowWordSet, setTomorrowWordSet] = useState(false)
  const [wordCheckLoading, setWordCheckLoading] = useState(true)

  useEffect(() => {
    if (!playerId) return
    Promise.all([
      readJson<PuzzleWord>(`data/words/${date}/${playerId}.json`),
      readJson<PuzzleWord>(`data/words/${tomorrowDate}/${playerId}.json`),
    ]).then(([todayFile, tomorrowFile]) => {
      setOwnWord(todayFile?.word ?? null)
      setTomorrowWordSet(tomorrowFile !== null)
      setWordCheckLoading(false)
    })
  }, [date, tomorrowDate, playerId])

  async function submitTodayWord(word: string): Promise<void> {
    if (!playerId) return
    const wordData: PuzzleWord = {
      date,
      setter_id: playerId,
      word: word.toUpperCase(),
      submitted_at: new Date().toISOString(),
    }
    await writeToS3(`data/words/${date}/${playerId}.json`, wordData)
    const statusKey = `data/days/${date}/status.json`
    const currentStatus = await readJson<DayStatus>(statusKey)

    // When the status file is missing, reconstruct words_set from individual
    // word files so we don't overwrite other players' already-set entries.
    let wordsSet: Record<string, boolean>
    if (currentStatus !== null) {
      wordsSet = { ...currentStatus.words_set, [playerId]: true }
    } else {
      const wordChecks = await Promise.all(
        CONFIG.players.map(p =>
          readJson<PuzzleWord>(`data/words/${date}/${p.id}.json`)
            .then(pw => [p.id, pw !== null] as const),
        ),
      )
      wordsSet = Object.fromEntries(wordChecks)
      wordsSet[playerId] = true
    }

    const allSet = CONFIG.players.every(p => wordsSet[p.id] === true)
    await writeToS3(statusKey, { date, words_set: wordsSet, unlocked: allSet })
    setOwnWord(word.toUpperCase())
  }

  async function submitTomorrowWord(word: string): Promise<void> {
    if (!playerId) return
    const wordData: PuzzleWord = {
      date: tomorrowDate,
      setter_id: playerId,
      word: word.toUpperCase(),
      submitted_at: new Date().toISOString(),
    }
    await writeToS3(`data/words/${tomorrowDate}/${playerId}.json`, wordData)
    setTomorrowWordSet(true)
  }

  if (!playerId) return null

  // The two setters are the players who are not the current player.
  const setters = CONFIG.players.filter((p) => p.id !== playerId)

  const wordsBlocked = !wordCheckLoading && (!ownWord || !tomorrowWordSet)

  if (wordCheckLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="w-full divide-y divide-gray-200 sm:divide-y-0 sm:space-y-4 sm:px-4 sm:py-6">
          {setters.map((setter) => (
            <div key={setter.id} className="overflow-hidden sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between bg-violet-700 px-4 py-4 text-left"
                disabled
              >
                <span className="text-lg font-bold text-white">Loading…</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {wordsBlocked && (
        <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Set your words to play</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {!ownWord
                    ? "You need to set today's puzzle word before you can play today's puzzles."
                    : "You need to set tomorrow's puzzle word before you can play today's puzzles."}
                </p>
              </div>
            </div>
            {!ownWord ? (
              <>
                <p className="text-xs font-medium text-gray-700">Today's Word</p>
                <WordSetForm
                  label="Enter a 5-letter word for others to guess"
                  usedWords={new Set()}
                  onSubmit={submitTodayWord}
                />
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-700">Tomorrow's Word</p>
                <WordSetForm
                  label="Enter a 5-letter word for tomorrow"
                  usedWords={new Set()}
                  onSubmit={submitTomorrowWord}
                />
              </>
            )}
          </div>
        </div>
      )}
      <div className={`w-full divide-y divide-gray-200 sm:divide-y-0 sm:space-y-4 sm:px-4 sm:py-6${wordsBlocked ? ' pointer-events-none opacity-50' : ''}`}>
        {setters.map((setter) => (
          <PuzzlePanel
            key={setter.id}
            setterId={setter.id}
            currentPlayerId={playerId}
            ownWord={ownWord}
            date={date}
          />
        ))}
      </div>
    </div>
  )
}
