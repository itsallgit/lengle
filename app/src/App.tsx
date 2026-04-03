import { createContext, useContext, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import PlayerSelect from './components/PlayerSelect/PlayerSelect'
import Lobby from './components/Lobby/Lobby'
import PuzzleView from './components/Puzzles/PuzzleView'
import Leaderboard from './components/Leaderboard/Leaderboard'
import WordHistory from './components/WordHistory/WordHistory'
import { useResultsFinalisation } from './hooks/useResultsFinalisation'

// ── Player context ────────────────────────────────────────────────────────────

export interface PlayerContextValue {
  /** The currently selected player ID, or null if none is selected. */
  playerId: string | null
  /** Persist the selected player ID to state and localStorage. */
  setPlayerId: (id: string | null) => void
}

/**
 * Exported so any component can consume the current player without prop-drilling.
 * Do not import PlayerContext directly — use the usePlayer() hook below.
 */
export const PlayerContext = createContext<PlayerContextValue>({
  playerId: null,
  setPlayerId: () => undefined,
})

/** Convenience hook for consuming PlayerContext. */
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
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/history" element={<WordHistory />} />
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

  return (
    <PlayerContext.Provider value={{ playerId, setPlayerId }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PlayerContext.Provider>
  )
}
