import { useEffect, useState } from 'react'
import { usePlayer } from '../../App'
import { CONFIG } from '../../lib/config'
import { getActivePuzzleDate } from '../../lib/date'
import { readJson } from '../../lib/s3'
import type { PuzzleWord } from '../../types'
import Header from '../shared/Header'
import PuzzlePanel from './PuzzlePanel'

export default function PuzzleView() {
  const { playerId } = usePlayer()

  // Compute the active puzzle date once at mount so both panels always use the
  // same date value even if the clock crosses 4am while the view is open.
  const [date] = useState(() => getActivePuzzleDate())

  // Fetch the current player's own word once and pass it to both panels for
  // AC-01 validation (a player cannot guess their own puzzle word).
  const [ownWord, setOwnWord] = useState<string | null>(null)

  useEffect(() => {
    if (!playerId) return
    readJson<PuzzleWord>(`data/words/${date}/${playerId}.json`).then((file) => {
      setOwnWord(file?.word ?? null)
    })
  }, [date, playerId])

  if (!playerId) return null

  // The two setters are the players who are not the current player.
  const setters = CONFIG.players.filter((p) => p.id !== playerId)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="w-full divide-y divide-gray-200 sm:divide-y-0 sm:space-y-4 sm:px-4 sm:py-6">
        {setters.map((setter) => (
          <PuzzlePanel
            key={setter.id}
            setterId={setter.id}
            currentPlayerId={playerId}
            ownWord={ownWord}
            date={date}
          />
        ))}
      </div>
    </div>
  )
}
