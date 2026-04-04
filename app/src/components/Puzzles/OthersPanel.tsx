import { useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'

interface OthersPanelProps {
  others: Array<{ playerId: string; guessCount: number; solved: boolean }>
}

export default function OthersPanel({ others }: OthersPanelProps) {
  const [open, setOpen] = useState(false)
  const { playerEmojis } = usePlayer()

  if (others.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-2.5 hover:bg-gray-200 active:bg-gray-300"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-700">Others</span>
        <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1 pl-4">
          {others.map(({ playerId, guessCount, solved }) => {
            const player = CONFIG.players.find((p) => p.id === playerId)
            const emoji = player ? (playerEmojis[playerId] ?? player.defaultEmoji) : ''
            const displayName = player ? `${emoji} ${player.name}` : playerId

            return (
              <div key={playerId} className="text-sm text-gray-700">
                {displayName} — {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}
                {solved ? ' ✓' : ''}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
