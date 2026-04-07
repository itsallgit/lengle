import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../App'
import { getActivePuzzleDate, isPastDate } from '../../lib/date'
import { readJson, writeToS3, listS3Keys } from '../../lib/s3'
import { CONFIG, PRESET_EMOJIS } from '../../lib/config'
import type { DayStatus, PuzzleWord } from '../../types'
import Header from '../shared/Header'
import PlayerStatusList from './PlayerStatusList'
import WordSetForm from './WordSetForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTomorrowPuzzleDate(): string {
  const active = getActivePuzzleDate()
  const [year, month, day] = active.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type LobbyState = 'A' | 'B' | 'C'

function deriveLobbyState(playerHasSetWord: boolean, status: DayStatus | null): LobbyState {
  if (!playerHasSetWord) return 'A'
  if (status?.unlocked) return 'C'
  return 'B'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Lobby() {
  const { playerId, playerEmojis, setPlayerEmoji } = usePlayer()
  const navigate = useNavigate()

  const todayDate = getActivePuzzleDate()
  const tomorrowDate = getTomorrowPuzzleDate()

  const [status, setStatus] = useState<DayStatus | null>(null)
  const [playerHasSetToday, setPlayerHasSetToday] = useState(false)
  const [tomorrowWord, setTomorrowWord] = useState<string | null>(null)
  const [usedWords, setUsedWords] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const [todaySetByPlayer, setTodaySetByPlayer] = useState<Record<string, boolean>>({})
  const [tomorrowSetByPlayer, setTomorrowSetByPlayer] = useState<Record<string, boolean>>({})

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    async function initialFetch() {
      if (!playerId) return

      const statusKey = `data/days/${todayDate}/status.json`
      const ownWordKey = `data/words/${todayDate}/${playerId}.json`
      const tomorrowWordKey = `data/words/${tomorrowDate}/${playerId}.json`

      // Fetch status + own word files + all players' today/tomorrow words in parallel
      const allPlayerWordFetches = CONFIG.players.flatMap(p => [
        readJson<PuzzleWord>(`data/words/${todayDate}/${p.id}.json`).then(pw => ({ type: 'today' as const, id: p.id, set: pw !== null })),
        readJson<PuzzleWord>(`data/words/${tomorrowDate}/${p.id}.json`).then(pw => ({ type: 'tomorrow' as const, id: p.id, set: pw !== null })),
      ])

      const [fetchedStatus, ownWord, fetchedTomorrowWord, ...playerWordResults] = await Promise.all([
        readJson<DayStatus>(statusKey),
        readJson<PuzzleWord>(ownWordKey),
        readJson<PuzzleWord>(tomorrowWordKey),
        ...allPlayerWordFetches,
      ])

      if (cancelledRef.current) return

      const todayMap: Record<string, boolean> = {}
      const tomorrowMap: Record<string, boolean> = {}
      for (const result of playerWordResults) {
        if (result.type === 'today') todayMap[result.id] = result.set
        else tomorrowMap[result.id] = result.set
      }

      setStatus(fetchedStatus)
      setPlayerHasSetToday(ownWord !== null)
      setTomorrowWord(fetchedTomorrowWord?.word ?? null)
      setTodaySetByPlayer(todayMap)
      setTomorrowSetByPlayer(tomorrowMap)
      setLoading(false)

      loadUsedWords()
    }

    initialFetch()

    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, todayDate])

  async function loadUsedWords() {
    try {
      const allKeys = await listS3Keys('data/words/')
      const pastKeys = allKeys.filter(key => {
        const parts = key.split('/')
        const datePart = parts[2]
        return datePart !== undefined && isPastDate(datePart)
      })
      const wordFiles = await Promise.all(pastKeys.map(key => readJson<PuzzleWord>(key)))
      if (cancelledRef.current) return
      const wordSet = new Set<string>(
        wordFiles
          .filter((f): f is PuzzleWord => f !== null)
          .map(f => f.word.toUpperCase()),
      )
      setUsedWords(wordSet)
    } catch {
      // Non-fatal — uniqueness check skipped if not ready
    }
  }

  // Polling (State B only)
  useEffect(() => {
    const lobbyState = deriveLobbyState(playerHasSetToday, status)
    if (lobbyState !== 'B') return

    const statusKey = `data/days/${todayDate}/status.json`
    const intervalId = setInterval(async () => {
      const refreshed = await readJson<DayStatus>(statusKey)
      if (cancelledRef.current) return
      if (refreshed !== null) {
        setStatus(refreshed)
        if (refreshed.unlocked) clearInterval(intervalId)
      }
    }, CONFIG.lobbyPollIntervalMs)

    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerHasSetToday, status?.unlocked, todayDate])

  async function submitWord(word: string, dateStr: string): Promise<void> {
    if (!playerId) return

    const wordKey = `data/words/${dateStr}/${playerId}.json`
    const wordData: PuzzleWord = {
      date: dateStr,
      setter_id: playerId,
      word: word.toUpperCase(),
      submitted_at: new Date().toISOString(),
    }
    await writeToS3(wordKey, wordData)

    if (dateStr === todayDate) {
      const statusKey = `data/days/${todayDate}/status.json`
      const currentStatus = await readJson<DayStatus>(statusKey)
      const mergedWordsSet: Record<string, boolean> = {
        ...(currentStatus?.words_set ?? {}),
        [playerId]: true,
      }
      const allSet = CONFIG.players.every(p => mergedWordsSet[p.id] === true)
      const newStatus: DayStatus = {
        date: todayDate,
        words_set: mergedWordsSet,
        unlocked: allSet,
      }
      await writeToS3(statusKey, newStatus)

      if (!cancelledRef.current) {
        setStatus(newStatus)
        setPlayerHasSetToday(true)
        setTodaySetByPlayer(prev => ({ ...prev, [playerId]: true }))
      }
    } else {
      if (!cancelledRef.current) {
        setTomorrowWord(word.toUpperCase())
        setTomorrowSetByPlayer(prev => ({ ...prev, [playerId]: true }))
      }
    }
  }

  if (!playerId) return null

  const lobbyState = deriveLobbyState(playerHasSetToday, status)
  const currentPlayerConfig = CONFIG.players.find(p => p.id === playerId)
  const currentPlayerName = currentPlayerConfig?.name ?? playerId
  const currentEmoji = playerEmojis[playerId] ?? currentPlayerConfig?.defaultEmoji ?? '🎯'

  const pendingPlayers = CONFIG.players.filter(
    p => p.id !== playerId && todaySetByPlayer[p.id] !== true,
  )

  const bothWordsSet = playerHasSetToday && tomorrowWord !== null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-8">

        {/* Greeting — emoji itself is the trigger for the picker */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(v => !v)}
            className="text-5xl leading-none rounded-lg p-0.5 hover:bg-gray-200 transition-colors"
            aria-label="Change emoji"
            title="Change your emoji"
          >
            {currentEmoji}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {currentPlayerName}!</h1>
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-gray-700">Choose your emoji</p>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={async () => {
                    await setPlayerEmoji(playerId, emoji)
                    setShowEmojiPicker(false)
                  }}
                  className={`rounded-lg p-1 text-xl hover:bg-violet-100 transition-colors ${
                    currentEmoji === emoji ? 'bg-violet-200 ring-2 ring-violet-500' : ''
                  }`}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Word submission status table */}
        {!loading && (
          <PlayerStatusList
            todayDate={todayDate}
            tomorrowDate={tomorrowDate}
            todaySetByPlayer={todaySetByPlayer}
            tomorrowSetByPlayer={tomorrowSetByPlayer}
          />
        )}

        {/* CTA 1 — Set Words */}
        {!loading && !bothWordsSet && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {lobbyState === 'A' ? (
              <>
                <h2 className="mb-4 text-sm font-bold text-gray-900">Set Today's Word</h2>
                <WordSetForm
                  label="Enter a 5-letter word for others to guess"
                  usedWords={usedWords}
                  onSubmit={word => submitWord(word, todayDate)}
                />
              </>
            ) : !tomorrowWord ? (
              <>
                <h2 className="mb-1 text-sm font-bold text-gray-900">Set Tomorrow's Word</h2>
                <p className="mb-4 text-xs text-gray-500">Today's word is already set ✅</p>
                <WordSetForm
                  label="Enter a 5-letter word for tomorrow"
                  usedWords={usedWords}
                  onSubmit={word => submitWord(word, tomorrowDate)}
                />
              </>
            ) : null}
          </section>
        )}

        {bothWordsSet && !loading && (
          <p className="text-center text-sm text-gray-500">✅ Words set for today and tomorrow</p>
        )}

        {/* CTA 2 — Play Today's Puzzles */}
        {!loading && lobbyState !== 'A' && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Today's Puzzles</h2>
              {pendingPlayers.length === 0 ? (
                <p className="mt-1 text-xs text-gray-500">All words are set — let's play!</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Waiting for{' '}
                  {pendingPlayers.map((p, i) => (
                    <span key={p.id}>
                      <span className="font-semibold">
                        {CONFIG.players.find(cp => cp.id === p.id)?.name}
                      </span>
                      {i < pendingPlayers.length - 1 ? ' and ' : ''}
                    </span>
                  ))}{' '}
                  to set their word…
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/play')}
              className="w-full rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Play Today's Puzzles
            </button>
          </section>
        )}

        {/* CTA 3 — Practice Puzzle (always shown) */}
        {!loading && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Practice Puzzle</h2>
              <p className="mt-1 text-xs text-gray-500">Play with a random word — no scores saved</p>
            </div>
            <button
              onClick={() => navigate('/practice')}
              className="w-full rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Play Practice Puzzle
            </button>
          </section>
        )}

        {/* CTA 4 — View Scores */}
        {!loading && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">View Scores</h2>
              <p className="mt-1 text-xs text-gray-500">Today&apos;s leaderboard &amp; all-time stats</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/leaderboard', { state: { tab: 'today' } })}
                className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
              >
                Today
              </button>
              <button
                onClick={() => navigate('/leaderboard', { state: { tab: 'alltime' } })}
                className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
              >
                All Time
              </button>
            </div>
          </section>
        )}

        {/* Version number */}
        {!loading && (
          <p className="text-center text-xs text-gray-400">v{__APP_VERSION__.split('.').slice(0, 2).join('.')}</p>
        )}

        {/* Player identity */}
        {!loading && (
          <p className="text-center text-xs text-gray-400">
            Playing as{' '}
            <span className="font-medium text-gray-600">{currentPlayerName}</span>{' '}
            &mdash;{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="underline hover:text-gray-700"
            >
              change player
            </button>
          </p>
        )}
      </main>
    </div>
  )
}

