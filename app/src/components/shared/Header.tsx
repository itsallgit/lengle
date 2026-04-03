import { getActivePuzzleDate } from '../../lib/date'
import Nav from './Nav'

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
    <header className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <span className="text-sm text-gray-500">{formatted}</span>
        <Nav />
      </div>
    </header>
  )
}
