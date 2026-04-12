import { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { CONFIG } from './lib/config'
import { writeToS3 } from './lib/s3'
import PlayerSelect from './components/PlayerSelect/PlayerSelect'
import Lobby from './components/Lobby/Lobby'
import PuzzleView from './components/Puzzles/PuzzleView'
import PracticeView from './components/Puzzles/PracticeView'
import PastPuzzleDetail from './components/Puzzles/PastPuzzleDetail'
import Leaderboard from './components/Leaderboard/Leaderboard'
import WordHistory from './components/WordHistory/WordHistory'
import SettingsView from './components/Settings/SettingsView'
import WhatsNewView from './components/WhatsNew/WhatsNewView'
import { SettingsProvider } from './context/SettingsContext'
import { useResultsFinalisation } from './hooks/useResultsFinalisation'
import { useS3Poll } from './hooks/useS3Poll'

// ── Player context ────────────────────────────────────────────────────────────

export interface PlayerContextValue {
  /** The currently selected player ID, or null if none is selected. */
  playerId: string | null
  /** Persist the selected player ID to state and localStorage. */
  setPlayerId: (id: string | null) => void
  /** Map of player ID → currently active emoji (may differ from defaultEmoji if customised). */
  playerEmojis: Record<string, string>
  /** Persist a new emoji for the given player to state and S3. */
  setPlayerEmoji: (playerId: string, emoji: string) => Promise<void>
}

/**
 * Exported so any component can consume the current player without prop-drilling.
 * Do not import PlayerContext directly — use the usePlayer() hook below.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextValue>({
  playerId: null,
  setPlayerId: () => undefined,
  playerEmojis: {},
  setPlayerEmoji: async () => undefined,
})

/** Convenience hook for consuming PlayerContext. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer(): PlayerContextValue {
  return useContext(PlayerContext)
}

// ── Protected route ───────────────────────────────────────────────────────────

/**
 * Redirects unauthenticated visitors to the Player Select screen.
 * Wrap all routes that require a selected player with this component.
 */
function ProtectedRoute() {
  const { playerId } = usePlayer()
  if (!playerId) return <Navigate to="/" replace />
  return <Outlet />
}

// ── Route tree ────────────────────────────────────────────────────────────────

/**
 * Separated from App so that useResultsFinalisation runs inside BrowserRouter
 * context (required by React Router hooks used in child components) while still
 * being wrapped by PlayerContext.Provider.
 */
function AppRoutes() {
  useResultsFinalisation()

  return (
    <Routes>
      <Route path="/" element={<PlayerSelect />} />

      {/* All routes below require a selected player */}
      <Route element={<ProtectedRoute />}>
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/play" element={<PuzzleView />} />
        <Route path="/practice" element={<PracticeView />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/history" element={<WordHistory />} />
        <Route path="/history/:date/:setterId/:guesserId" element={<PastPuzzleDetail />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/whats-new" element={<WhatsNewView />} />
      </Route>

      {/* Catch-all → Player Select */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function App() {
  const [playerId, setPlayerId] = useState<string | null>(
    () => localStorage.getItem('lengle_player_id'),
  )

  const [playerEmojis, setPlayerEmojis] = useState<Record<string, string>>(
    () => Object.fromEntries(CONFIG.players.map((p) => [p.id, p.defaultEmoji])),
  )

  const profilesFromS3 = useS3Poll<Record<string, string>>({
    key: 'data/players/profiles.json',
    intervalMs: CONFIG.profilePollIntervalMs,
  })

  useEffect(() => {
    if (profilesFromS3) {
      setPlayerEmojis((prev) => ({ ...prev, ...profilesFromS3 }))
    }
  }, [profilesFromS3])

  async function setPlayerEmoji(pid: string, emoji: string): Promise<void> {
    const updated = { ...playerEmojis, [pid]: emoji }
    setPlayerEmojis(updated)
    await writeToS3('data/players/profiles.json', updated)
  }

  return (
    <SettingsProvider>
      <PlayerContext.Provider value={{ playerId, setPlayerId, playerEmojis, setPlayerEmoji }}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PlayerContext.Provider>
    </SettingsProvider>
  )
}
