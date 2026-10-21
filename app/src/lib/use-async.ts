import { useCallback, useEffect, useState } from 'react'

import { errorMessage } from '@/lib/api'

export type AsyncState<T> = {
  data: T | null
  error: string | null
  loading: boolean
  refreshing: boolean
  /** Re-fetch, showing the pull-to-refresh spinner. */
  refresh: () => Promise<void>
  /** Re-fetch, showing the full-page loader. */
  reload: () => Promise<void>
  setData: (value: T | null) => void
}

/**
 * The load / refresh / error dance that every screen needs, in one place.
 *
 * `deps` behaves like a useEffect dependency list: change them and the data is
 * fetched again.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)

      try {
        const value = await loader()
        setData(value)
        setError(null)
      } catch (problem) {
        setError(errorMessage(problem))
      } finally {
        if (mode === 'refresh') setRefreshing(false)
        else setLoading(false)
      }
    },
    // Forwarded from the caller on purpose: every screen declares what its
    // request depends on (an id, a slug, a flag). ESLint cannot see through the
    // forwarding, and the React Compiler simply skips this hook.
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
    deps,
  )

  useEffect(() => {
    void run('initial')
  }, [run])

  return {
    data,
    error,
    loading,
    refreshing,
    refresh: () => run('refresh'),
    reload: () => run('initial'),
    setData,
  }
}
