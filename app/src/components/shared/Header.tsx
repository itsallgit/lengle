import { useLocation, useNavigate } from 'react-router-dom'
import { getActivePuzzleDate } from '../../lib/date'
import { NavMenu } from './Nav'

const PAGE_LABELS: Record<string, string> = {
  '/play': 'Play',
  '/practice': 'Practice',
  '/leaderboard': 'Scores',
  '/history': 'Past Puzzles',
}

/**
 * Persistent page header showing today's active puzzle date and main navigation.
 * Rendered on all screens except Player Select (which has no navigation).
 */
export default function Header() {
  const dateStr = getActivePuzzleDate() // YYYY-MM-DD
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pageLabel = PAGE_LABELS[pathname] ?? (pathname.startsWith('/history/') ? 'Past Puzzle' : null)

  // Parse as local noon to avoid timezone/DST edge cases
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  const formatted = date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const isHome = pathname === '/lobby'

  return (
    <div className="sticky top-0 z-40 bg-gray-900 shadow-md">
      <header className="px-4 py-3">
        <div className="relative flex items-center justify-between">
          {pathname.startsWith('/history/') ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-gray-400 hover:text-white"
            >
              ← Back
            </button>
          ) : (
            <span className={`text-sm font-medium text-gray-400 ${pathname === '/play' ? '' : 'invisible'}`}>{formatted}</span>
          )}
          {isHome ? (
            <div className="absolute left-1/2 -translate-x-1/2 flex gap-1">
              {'LENGLE'.split('').map((letter, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded bg-green-500 text-xs font-bold text-white"
                >
                  {letter}
                </span>
              ))}
            </div>
          ) : pageLabel ? (
            <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-bold text-white" style={{ fontSize: 'clamp(0.875rem, 5vw, 1.25rem)' }}>
              {pageLabel}
            </span>
          ) : null}
          <NavMenu />
        </div>
      </header>
    </div>
  )
}
