import { CONFIG } from '../../lib/config'
import type { DayStatus } from '../../types'

interface Props {
  status: DayStatus | null
}

/**
 * Renders the lobby status list showing which players have set their word
 * for today. Displays ✅ for submitted and ⏳ for pending (spec §8 Screen 2).
 *
 * Accepts null status while the initial fetch is in flight — renders all
 * players as pending until real data arrives.
 */
export default function PlayerStatusList({ status }: Props) {
  return (
    <ul className="space-y-2">
      {CONFIG.players.map(player => {
        const hasSet = status?.words_set[player.id] === true
        return (
          <li
            key={player.id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm"
          >
            <span className="font-medium text-gray-800">{player.name}</span>
            <span aria-label={hasSet ? 'Submitted' : 'Pending'}>
              {hasSet ? '✅' : '⏳'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
