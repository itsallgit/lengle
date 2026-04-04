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
    <div className="border-t border-gray-200 mt-3 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>Others</span>
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
