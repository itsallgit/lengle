import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'

/**
 * Screen 1 — Player Select (spec §8 Screen 1).
 *
 * Shown on every visit before any game content is displayed. Presents a
 * dropdown of the three fixed player names with the last-used name
 * pre-selected (AC-17). A single "Play" button persists the selection and
 * navigates to the Lobby.
 *
 * No Header or Nav is rendered on this screen.
 */
export default function PlayerSelect() {
  const { playerId, setPlayerId } = usePlayer()
  const navigate = useNavigate()

  // Pre-select the context player if available, otherwise the first player.
  const [selected, setSelected] = useState<string>(
    playerId ?? CONFIG.players[0].id,
  )

  function handlePlay() {
    localStorage.setItem('lengle_player_id', selected)
    setPlayerId(selected)
    navigate('/lobby')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900">
          Lengle
        </h1>

        <div className="space-y-1">
          <label
            htmlFor="player-select"
            className="block text-sm font-medium text-gray-700"
          >
            Who are you?
          </label>
          <select
            id="player-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {CONFIG.players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePlay}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Play
        </button>
      </div>
    </main>
  )
}
