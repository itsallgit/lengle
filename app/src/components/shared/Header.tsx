import { getActivePuzzleDate } from '../../lib/date'
import { NavMenu } from './Nav'

/**
 * Persistent page header showing today's active puzzle date and main navigation.
 * Rendered on all screens except Player Select (which has no navigation).
 */
export default function Header() {
  const dateStr = getActivePuzzleDate() // YYYY-MM-DD

  // Parse as local noon to avoid timezone/DST edge cases
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  const formatted = date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="relative">
      <header className="bg-gray-900 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">{formatted}</span>
          <NavMenu />
        </div>
      </header>
    </div>
  )
}
