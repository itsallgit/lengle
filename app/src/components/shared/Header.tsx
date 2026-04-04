import { useLocation } from 'react-router-dom'
import { getActivePuzzleDate } from '../../lib/date'
import { NavMenu } from './Nav'

const PAGE_LABELS: Record<string, string> = {
  '/lobby': 'Lobby',
  '/play': 'Play',
  '/leaderboard': 'Board',
  '/history': 'History',
}

/**
 * Persistent page header showing today's active puzzle date and main navigation.
 * Rendered on all screens except Player Select (which has no navigation).
 */
export default function Header() {
  const dateStr = getActivePuzzleDate() // YYYY-MM-DD
  const { pathname } = useLocation()
  const pageLabel = PAGE_LABELS[pathname] ?? null

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
    <div className="sticky top-0 z-40 bg-gray-900 shadow-md">
      <header className="px-4 py-3">
        <div className="relative flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">{formatted}</span>
          {pageLabel && (
            <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white">
              {pageLabel}
            </span>
          )}
          <NavMenu />
        </div>
      </header>
    </div>
  )
}
