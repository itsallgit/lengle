import { Link, useLocation } from 'react-router-dom'

interface NavLink {
  to: string
  label: string
}

const NAV_LINKS: NavLink[] = [
  { to: '/lobby', label: 'Lobby' },
  { to: '/play', label: 'Play' },
  { to: '/leaderboard', label: 'Board' },
  { to: '/history', label: 'History' },
]

/**
 * Top-level navigation links.
 * Rendered inside the indigo Header; active route is bold + white underline.
 */
export default function Nav() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Main navigation" className="flex gap-4">
      {NAV_LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className={
            pathname === to
              ? 'text-sm font-bold text-white underline underline-offset-4 decoration-2'
              : 'text-sm font-medium text-indigo-200 hover:text-white'
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
