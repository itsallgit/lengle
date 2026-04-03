import { useState, useEffect, useCallback, useRef } from 'react'
import { readJson } from '../lib/s3'

interface UseS3PollOptions {
  /** S3/CloudFront key to poll, e.g. 'data/days/2026-04-03/status.json' */
  key: string
  /** Milliseconds between each poll. */
  intervalMs: number
  /** When false, polling is suspended. Defaults to true. */
  enabled?: boolean
}

/**
 * Polls a CloudFront URL on a fixed interval and returns the latest parsed JSON.
 *
 * - Fetches immediately when enabled becomes true, then every intervalMs.
 * - Clears the interval when enabled becomes false or the component unmounts.
 * - Returns null until the first successful response.
 * - Uses a ref for the key so a key change takes effect on the next tick without
 *   restarting the interval (for the lobby the key is always the same date).
 */
export function useS3Poll<T>(options: UseS3PollOptions): T | null {
  const { key, intervalMs, enabled = true } = options
  const [data, setData] = useState<T | null>(null)

  // Keep key in a ref so the stable callback always reads the latest value.
  const keyRef = useRef(key)
  keyRef.current = key

  const poll = useCallback(async () => {
    const result = await readJson<T>(keyRef.current)
    if (result !== null) {
      setData(result)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    void poll()
    const timerId = setInterval(() => {
      void poll()
    }, intervalMs)

    return () => clearInterval(timerId)
  }, [enabled, intervalMs, poll])

  return data
}
