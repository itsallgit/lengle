import { CONFIG } from './config'

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the active puzzle date string (YYYY-MM-DD) accounting for the 4am reset.
 * At 3:59am April 2, returns "2026-04-01". At 4:00am April 2, returns "2026-04-02".
 */
export function getActivePuzzleDate(): string {
  const now = new Date()
  if (now.getHours() < CONFIG.resetHour) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return formatDate(yesterday)
  }
  return formatDate(now)
}

/**
 * Returns the previous puzzle date string (YYYY-MM-DD).
 * Used to check whether the previous day's results have been finalised (AC-20).
 */
export function getPreviousPuzzleDate(): string {
  const activeDate = getActivePuzzleDate()
  // Parse at local noon to avoid DST edge cases when subtracting a day
  const date = new Date(`${activeDate}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return formatDate(date)
}

/**
 * Returns the next puzzle date string (YYYY-MM-DD) — one calendar day after the active puzzle date.
 * Used to check whether tomorrow's word has been set before allowing play.
 */
export function getTomorrowPuzzleDate(): string {
  const active = getActivePuzzleDate()
  const [year, month, day] = active.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns true if the given date string is strictly before the current active puzzle date.
 * YYYY-MM-DD lexicographic comparison is safe for ISO date strings.
 */
export function isPastDate(date: string): boolean {
  return date < getActivePuzzleDate()
}
