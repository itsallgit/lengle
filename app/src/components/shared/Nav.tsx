import { useEffect, useState } from 'react'
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
 * Hamburger-triggered animated dropdown navigation menu.
 * The dropdown element always stays in the DOM so the CSS max-height
 * transition plays correctly on open/close.
 */
export function NavMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the menu whenever the route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="text-white text-xl font-bold p-1"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Dropdown — always in DOM, animated via max-height */}
      <div
        className={`absolute top-full right-0 w-48 bg-gray-900 border border-gray-700 rounded-b-lg shadow-lg z-50 overflow-hidden transition-all duration-200 ease-in-out ${
          open ? 'max-h-48' : 'max-h-0'
        }`}
        aria-hidden={!open}
      >
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={
              pathname === to
                ? 'block py-2 px-4 text-sm font-bold text-white bg-gray-700'
                : 'block py-2 px-4 text-sm text-gray-200 hover:text-white hover:bg-gray-800'
            }
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// Keep a default export for any legacy imports
export default NavMenu
