import { CONFIG } from '../../lib/config'
import { usePlayer } from '../../App'

interface Props {
  todayDate: string
  tomorrowDate: string
  todaySetByPlayer: Record<string, boolean>
  tomorrowSetByPlayer: Record<string, boolean>
}

function formatShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day, 12)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function PlayerStatusList({
  todayDate,
  tomorrowDate,
  todaySetByPlayer,
  tomorrowSetByPlayer,
}: Props) {
  const { playerEmojis } = usePlayer()

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Player</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
              <div>TODAY</div>
              <div className="font-normal text-gray-400">{formatShort(todayDate)}</div>
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
              <div>TOMORROW</div>
              <div className="font-normal text-gray-400">{formatShort(tomorrowDate)}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {CONFIG.players.map((player) => {
            const emoji = playerEmojis[player.id] ?? player.defaultEmoji
            const todaySet = todaySetByPlayer[player.id] === true
            const tomorrowSet = tomorrowSetByPlayer[player.id] === true
            return (
              <tr key={player.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {emoji} {player.name}
                </td>
                <td className="px-4 py-3 text-center text-base">
                  {todaySet ? '✅' : '⏳'}
                </td>
                <td className="px-4 py-3 text-center text-base">
                  {tomorrowSet ? '✅' : '⏳'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
