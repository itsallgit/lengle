import { useState } from 'react'

const STORAGE_KEY = 'lengle_whats_new_read'

export function useWhatsNew() {
  const [readVersion, setReadVersion] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )

  const isUnread = readVersion !== __APP_VERSION__

  function markRead() {
    localStorage.setItem(STORAGE_KEY, __APP_VERSION__)
    setReadVersion(__APP_VERSION__)
  }

  return { isUnread, markRead }
}
