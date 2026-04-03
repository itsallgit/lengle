import { useState } from 'react'
import Header from '../shared/Header'
import TodayTab from './TodayTab'
import AllTimeTab from './AllTimeTab'
import TrendsTab from './TrendsTab'

type Tab = 'today' | 'alltime' | 'trends'

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-gray-900">Leaderboard</h1>

        {/* Tab bar */}
        <div className="mb-6 flex border-b border-gray-200">
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
                  ? 'border-b-2 border-gray-900 px-4 pb-3 pt-1 text-sm font-semibold text-gray-900'
                  : 'border-b-2 border-transparent px-4 pb-3 pt-1 text-sm font-medium text-gray-500 hover:text-gray-800'
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
