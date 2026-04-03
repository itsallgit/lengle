import { Link, useLocation } from 'react-router-dom'

interface NavLink {
  to: string
  label: string
}

const NAV_LINKS: NavLink[] = [
  { to: '/lobby', label: 'Lobby' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/history', label: 'History' },
]

/**
 * Top-level navigation links.
 * Rendered inside Header; the active route is indicated by an underline.
 */
export default function Nav() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Main navigation" className="flex gap-5">
      {NAV_LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className={
            pathname === to
              ? 'text-sm font-semibold text-gray-900 underline underline-offset-2'
              : 'text-sm font-medium text-gray-500 hover:text-gray-800'
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
