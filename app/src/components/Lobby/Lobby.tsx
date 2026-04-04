import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../App'
import { getActivePuzzleDate, isPastDate } from '../../lib/date'
import { readJson, writeToS3, listS3Keys } from '../../lib/s3'
import { CONFIG } from '../../lib/config'
import type { DayStatus, PuzzleWord } from '../../types'
import Header from '../shared/Header'
import PlayerStatusList from './PlayerStatusList'
import WordSetForm from './WordSetForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the puzzle date string for the day after the active puzzle date. */
function getTomorrowPuzzleDate(): string {
  const active = getActivePuzzleDate() // YYYY-MM-DD
  const [year, month, day] = active.split('-').map(Number)
  // Parse at local noon to avoid DST edge cases
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Lobby state machine ───────────────────────────────────────────────────────

/** The three mutually exclusive lobby states (spec §8 Screen 2). */
type LobbyState = 'A' | 'B' | 'C'

function deriveLobbyState(
  playerHasSetWord: boolean,
  status: DayStatus | null,
): LobbyState {
  if (!playerHasSetWord) return 'A'
  if (status?.unlocked) return 'C'
  return 'B'
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Screen 2 — Lobby / Word Setting (spec §8 Screen 2).
 *
 * State A: player has not set today's word — shows WordSetForm.
 * State B: player has set word, others still pending — shows waiting message
 *          and polls status.json every 30 s (spec §5.7).
 * State C: all words set and unlocked — shows "Play Today's Puzzles" button.
 *
 * An always-visible "Set Tomorrow's Word" collapsible section is available in
 * all states once today's puzzle is open (spec §8 Screen 2, spec §3.2 AC-06).
 *
 * On mount:
 *   1. Fetches status.json and today's own word file in parallel to establish
 *      initial state without flicker.
 *   2. Fetches tomorrow's own word file to check if it is already set.
 *   3. Loads all past puzzle words into a Set for uniqueness validation (AC-03).
 */
export default function Lobby() {
  const { playerId } = usePlayer()
  const navigate = useNavigate()

  const todayDate = getActivePuzzleDate()
  const tomorrowDate = getTomorrowPuzzleDate()

  // ── Core state ─────────────────────────────────────────────────────────────

  const [status, setStatus] = useState<DayStatus | null>(null)
  const [playerHasSetToday, setPlayerHasSetToday] = useState(false)
  const [tomorrowWord, setTomorrowWord] = useState<string | null>(null)
  const [usedWords, setUsedWords] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // "Set Tomorrow's Word" collapsible is collapsed by default (spec §8 Screen 2)
  const [tomorrowOpen, setTomorrowOpen] = useState(false)

  // Guard against setting state after unmount
  const cancelledRef = useRef(false)

  // ── Mount: parallel initial fetches ───────────────────────────────────────

  useEffect(() => {
    cancelledRef.current = false

    async function initialFetch() {
      if (!playerId) return

      // 1. Fetch today's status and own word file in parallel (no flicker)
      const statusKey = `data/days/${todayDate}/status.json`
      const ownWordKey = `data/words/${todayDate}/${playerId}.json`
      const tomorrowWordKey = `data/words/${tomorrowDate}/${playerId}.json`

      const [fetchedStatus, ownWord, fetchedTomorrowWord] = await Promise.all([
        readJson<DayStatus>(statusKey),
        readJson<PuzzleWord>(ownWordKey),
        readJson<PuzzleWord>(tomorrowWordKey),
      ])

      if (cancelledRef.current) return

      setStatus(fetchedStatus)
      setPlayerHasSetToday(ownWord !== null)
      setTomorrowWord(fetchedTomorrowWord?.word ?? null)
      setLoading(false)

      // 2. Load used words in the background for uniqueness validation (AC-03).
      //    Non-blocking — submit will fall back gracefully if not yet ready.
      loadUsedWords()
    }

    initialFetch()

    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, todayDate])

  // ── Load all previously used puzzle words (AC-03) ─────────────────────────

  async function loadUsedWords() {
    try {
      const allKeys = await listS3Keys('data/words/')
      // Only words from past dates contribute to the uniqueness set
      const pastKeys = allKeys.filter(key => {
        // Key format: data/words/{YYYY-MM-DD}/{setter-id}.json
        const parts = key.split('/')
        const datePart = parts[2] // index 2 after split on '/'
        return datePart !== undefined && isPastDate(datePart)
      })

      const wordFiles = await Promise.all(
        pastKeys.map(key => readJson<PuzzleWord>(key)),
      )

      if (cancelledRef.current) return

      const wordSet = new Set<string>(
        wordFiles
          .filter((f): f is PuzzleWord => f !== null)
          .map(f => f.word.toUpperCase()),
      )
      setUsedWords(wordSet)
    } catch {
      // Non-fatal — uniqueness check is skipped if set is not ready (spec §5.5)
    }
  }

  // ── Polling (State B only — spec §5.7) ────────────────────────────────────

  useEffect(() => {
    const lobbyState = deriveLobbyState(playerHasSetToday, status)
    if (lobbyState !== 'B') return

    const statusKey = `data/days/${todayDate}/status.json`

    const intervalId = setInterval(async () => {
      const refreshed = await readJson<DayStatus>(statusKey)
      if (cancelledRef.current) return
      if (refreshed !== null) {
        setStatus(refreshed)
        // Stop polling immediately once unlocked
        if (refreshed.unlocked) {
          clearInterval(intervalId)
        }
      }
    }, CONFIG.lobbyPollIntervalMs)

    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerHasSetToday, status?.unlocked, todayDate])

  // ── Word submission ────────────────────────────────────────────────────────

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

    // Update status.json — read current (may be null for first player), merge,
    // recompute unlocked, write back. Last-write-wins is safe (spec §5.4).
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
      }
    } else {
      // Tomorrow's word — no status.json update needed
      if (!cancelledRef.current) {
        setTomorrowWord(word.toUpperCase())
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!playerId) return null

  const lobbyState = deriveLobbyState(playerHasSetToday, status)

  const currentPlayerName =
    CONFIG.players.find(p => p.id === playerId)?.name ?? playerId

  const pendingPlayers = CONFIG.players.filter(
    p => p.id !== playerId && status?.words_set[p.id] !== true,
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
        {/* ── Page title ── */}
        <h1 className="text-xl font-bold text-gray-900">
          Today&rsquo;s Lobby
          {loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              Loading…
            </span>
          )}
        </h1>

        {/* ── State A: player has not set today's word ── */}
        {!loading && lobbyState === 'A' && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <WordSetForm
              label="Set today's word"
              usedWords={usedWords}
              onSubmit={word => submitWord(word, todayDate)}
            />
          </section>
        )}

        {/* ── State B: player set word, waiting for others ── */}
        {!loading && lobbyState === 'B' && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-1">
            {pendingPlayers.length === 1 ? (
              <p className="text-sm text-gray-700">
                Waiting for{' '}
                <span className="font-semibold">
                  {CONFIG.players.find(p => p.id === pendingPlayers[0].id)
                    ?.name}
                </span>{' '}
                to set their word…
              </p>
            ) : (
              <p className="text-sm text-gray-700">
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
            <p className="text-xs text-gray-400">
              Checking for updates every 30 seconds
            </p>
          </section>
        )}

        {/* ── State C: all words set, ready to play ── */}
        {!loading && lobbyState === 'C' && (
          <section className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm text-center space-y-4">
            <p className="text-sm font-medium text-green-800">
              All words are set — let&rsquo;s play!
            </p>
            <button
              onClick={() => navigate('/play')}
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Play Today&rsquo;s Puzzles
            </button>
          </section>
        )}

        {/* ── Status list (visible in all states once loaded) ── */}
        {!loading && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
              Today&rsquo;s word submission status
            </h2>
            <PlayerStatusList status={status} />
          </section>
        )}

        {/* ── Tomorrow's word (collapsible, always available after 4am, AC-06) ── */}
        {!loading && (
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setTomorrowOpen(open => !open)}
              aria-expanded={tomorrowOpen}
              className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>Set Tomorrow&rsquo;s Word</span>
              <span aria-hidden className="text-gray-400">
                {tomorrowOpen ? '▲' : '▼'}
              </span>
            </button>

            {tomorrowOpen && (
              <div className="border-t border-gray-100 px-6 py-5">
                {tomorrowWord !== null ? (
                  <div className="space-y-1">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ Word set for tomorrow
                    </p>
                    <p className="font-mono text-lg font-bold tracking-widest text-gray-900">
                      {tomorrowWord}
                    </p>
                  </div>
                ) : (
                  <WordSetForm
                    label={`Set your word for ${tomorrowDate}`}
                    usedWords={usedWords}
                    onSubmit={word => submitWord(word, tomorrowDate)}
                  />
                )}
              </div>
            )}
          </section>
        )}

        {/* Player identity reminder */}
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
