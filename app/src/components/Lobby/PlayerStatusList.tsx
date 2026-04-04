import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import type { DayStatus } from '../../types'

interface Props {
  status: DayStatus | null
}

/**
 * Renders the lobby status list showing which players have set their word
 * for today. Green row for submitted, amber row for pending (spec §8 Screen 2).
 *
 * Accepts null status while the initial fetch is in flight — renders all
 * players as pending until real data arrives.
 */
export default function PlayerStatusList({ status }: Props) {
  const { playerEmojis } = usePlayer()

  return (
    <ul className="space-y-2">
      {CONFIG.players.map(player => {
        const hasSet = status?.words_set[player.id] === true
        const emoji = playerEmojis[player.id] ?? player.defaultEmoji
        return (
          <li
            key={player.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
              hasSet
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <span>{emoji} {player.name}</span>
            <span aria-label={hasSet ? 'Submitted' : 'Pending'}>
              {hasSet ? '✅' : '⏳'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
