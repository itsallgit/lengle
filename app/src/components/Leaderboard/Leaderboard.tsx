import { useState } from 'react'
import Header from '../shared/Header'
import TodayTab from './TodayTab'
import AllTimeTab from './AllTimeTab'
import TrendsTab from './TrendsTab'

type Tab = 'today' | 'alltime' | 'trends'

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="w-full px-4 py-6">
        <h1 className="mb-4 text-2xl font-black text-gray-900">Leaderboard</h1>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'alltime', label: 'All Time' },
              { id: 'trends', label: 'Trends' },
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
        {activeTab === 'trends' && <TrendsTab />}
      </div>
    </div>
  )
}
