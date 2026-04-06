import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../shared/Header'
import TodayTab from './TodayTab'
import AllTimeTab from './AllTimeTab'

type Tab = 'today' | 'alltime'

export default function Leaderboard() {
  const location = useLocation()
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'today'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="w-full px-4 py-6">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'alltime', label: 'All Time' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={
                activeTab === id
                  ? 'flex-1 rounded-lg bg-gray-900 py-2 text-sm font-bold text-white shadow'
                  : 'flex-1 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50'
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'today' && <TodayTab />}
        {activeTab === 'alltime' && <AllTimeTab />}
      </div>
    </div>
  )
}
