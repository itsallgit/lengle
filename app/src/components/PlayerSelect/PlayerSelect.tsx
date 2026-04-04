import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'

const PRESET_EMOJIS = [
  '🎯', '🌸', '⚡', '🦁', '🐯', '🦊',
  '🦋', '🌈', '🎸', '🎮', '🏆', '🎪',
  '🌺', '🍀', '🦄', '🐉', '🌟', '💫',
  '🔥', '🌊', '🎭', '🎨', '🎲', '🍕',
]

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
  const { playerId, setPlayerId, playerEmojis, setPlayerEmoji } = usePlayer()
  const navigate = useNavigate()

  // Pre-select the context player if available, otherwise the first player.
  const [selected, setSelected] = useState<string>(
    playerId ?? CONFIG.players[0].id,
  )
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const currentPlayer = CONFIG.players.find((p) => p.id === selected)
  const currentEmoji = playerEmojis[selected] ?? currentPlayer?.defaultEmoji ?? '🎯'

  function handlePlay() {
    localStorage.setItem('lengle_player_id', selected)
    setPlayerId(selected)
    navigate('/lobby')
  }

  function handleSelectPlayer(id: string) {
    setSelected(id)
    setShowEmojiPicker(false)
  }

  function handleEmojiPick(emoji: string) {
    void setPlayerEmoji(selected, emoji)
    setShowEmojiPicker(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-indigo-700">
            Lengle
          </h1>
          <p className="mt-1 text-sm text-gray-500">Daily word puzzle</p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="player-select"
            className="block text-sm font-semibold text-gray-700"
          >
            Who are you?
          </label>
          <select
            id="player-select"
            value={selected}
            onChange={e => handleSelectPlayer(e.target.value)}
            className="w-full rounded-xl border-2 border-indigo-200 px-3 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {CONFIG.players.map(p => (
              <option key={p.id} value={p.id}>
                {playerEmojis[p.id] ?? p.defaultEmoji} {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Emoji customiser */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Your emoji</span>
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-1.5 text-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="Change emoji"
            >
              <span>{currentEmoji}</span>
              <span className="text-xs text-indigo-500">{showEmojiPicker ? '▲' : '▼'}</span>
            </button>
          </div>

          {showEmojiPicker && (
            <div className="grid grid-cols-6 gap-1 rounded-xl border border-indigo-100 bg-indigo-50 p-2">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiPick(emoji)}
                  className={`flex items-center justify-center rounded-lg p-1.5 text-xl hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    emoji === currentEmoji ? 'bg-white shadow-sm ring-2 ring-indigo-400' : ''
                  }`}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handlePlay}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Play →
        </button>
      </div>
    </main>
  )
}
