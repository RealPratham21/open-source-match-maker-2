'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Recommendation } from '@/lib/mock-data'

const SavedContext = createContext<{
  saved: number[]
  items: Recommendation[]
  loading: boolean
  error: string | null
  toggle: (recommendation: Recommendation) => Promise<void>
} | null>(null)

export function SavedStateProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const saved = items.map((item) => item.id)

  useEffect(() => {
    let active = true
    void fetch('/api/user-issues')
      .then(async (response) => {
        const payload = (await response.json()) as { recommendations?: Recommendation[]; error?: string }
        if (!response.ok) throw new Error(payload.error ?? 'Could not load saved issues.')
        if (active) setItems(payload.recommendations ?? [])
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load saved issues.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function toggle(recommendation: Recommendation) {
    const wasSaved = items.some((item) => item.id === recommendation.id)
    setError(null)
    setItems((current) =>
      wasSaved ? current.filter((item) => item.id !== recommendation.id) : [recommendation, ...current],
    )

    const response = await fetch(wasSaved ? `/api/user-issues?id=${recommendation.id}` : '/api/user-issues', {
      method: wasSaved ? 'DELETE' : 'PUT',
      headers: wasSaved ? undefined : { 'Content-Type': 'application/json' },
      body: wasSaved ? undefined : JSON.stringify({ recommendation, status: 'saved' }),
    })
    if (!response.ok) {
      setItems((current) =>
        wasSaved
          ? current.some((item) => item.id === recommendation.id)
            ? current
            : [recommendation, ...current]
          : current.filter((item) => item.id !== recommendation.id),
      )
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      const message = payload?.error ?? 'Could not update saved issue.'
      setError(message)
    }
  }

  return <SavedContext.Provider value={{ saved, items, loading, error, toggle }}>{children}</SavedContext.Provider>
}

export function useSavedIssues() {
  const value = useContext(SavedContext)
  if (!value) throw new Error('useSavedIssues must be used within SavedStateProvider')
  return value
}
