import { useEffect, useState } from 'react'
import Header from '../shared/Header'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import { readJson } from '../../lib/s3'

interface Feature {
  emoji: string
  title: string
  description: string
}

interface Release {
  version: string
  label: string
  features: Feature[]
}

interface WhatsNewData {
  releases: Release[]
}

export default function WhatsNewView() {
  const { markRead } = useWhatsNew()
  const [data, setData] = useState<WhatsNewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    markRead()
    void readJson<WhatsNewData>('data/whats-new.json').then((result) => {
      setData(result)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-12">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && !data && (
          <p className="text-sm text-gray-500">Nothing to show yet.</p>
        )}
        {data?.releases.map((release, i) => (
          <section key={release.version}>
            {i > 0 && <hr className="mb-12 border-gray-200" />}
            <div className="mb-6 flex items-center gap-3">
              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                v{release.version}
              </span>
              <span className="text-sm text-gray-400">{release.label}</span>
            </div>
            <div className="space-y-4">
              {release.features.map((feature, fi) => (
                <div
                  key={fi}
                  className="flex gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100"
                >
                  <span className="text-2xl leading-none mt-0.5">{feature.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{feature.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
