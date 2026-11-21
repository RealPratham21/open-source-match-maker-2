'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Recommendation } from '@/lib/mock-data'
import type { CandidateIssue } from '@/lib/github/types'

const STORAGE_KEY = 'contribmatch.discovery'

type DiscoveryState = {
  recommendations: Recommendation[]
  candidates: CandidateIssue[]
  loading: boolean
  stage: string
  error: string | null
  run: (force?: boolean) => Promise<void>
  patchRecommendation: (recommendation: Recommendation) => void
}

const DiscoveryContext = createContext<DiscoveryState | null>(null)

const STAGES = [
  'Finding active repositories…',
  'Searching open issues…',
  'Checking project setup…',
  'Preparing candidates…',
]

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [candidates, setCandidates] = useState<CandidateIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState('Loading previous matches…')
  const [error, setError] = useState<string | null>(null)
  const inflight = useRef(false)
  const candidatesRef = useRef<CandidateIssue[]>([])
  candidatesRef.current = candidates

  const run = useCallback(async (force = false) => {
    if (inflight.current) return

    if (!force) {
      const cached = readCache()
      if (cached) {
        setRecommendations(cached.recommendations)
        setCandidates(cached.candidates)
        return
      }
    }

    inflight.current = true
    setLoading(true)
    setError(null)
    setStage(STAGES[0])
    const timer = window.setInterval(() => {
      setStage((current) => {
        const index = STAGES.indexOf(current)
        return STAGES[Math.min(index + 1, STAGES.length - 1)]
      })
    }, 3500)

    try {
      const response = await fetch('/api/discover', { method: 'POST' })
      const payload = (await response.json()) as {
        error?: string
        recommendations?: Recommendation[]
        candidates?: CandidateIssue[]
      }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Discovery failed. Please try again.')
      }
      const nextRecommendations = payload.recommendations ?? []
      const nextCandidates = payload.candidates ?? []
      setRecommendations(nextRecommendations)
      setCandidates(nextCandidates)
      writeCache({ recommendations: nextRecommendations, candidates: nextCandidates })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed. Please try again.')
      setRecommendations([])
      setCandidates([])
    } finally {
      inflight.current = false
      window.clearInterval(timer)
      setLoading(false)
    }
  }, [])

  const patchRecommendation = useCallback((recommendation: Recommendation) => {
    setRecommendations((current) => {
      if (!current.some((item) => item.id === recommendation.id)) return current
      const next = current.map((item) => (item.id === recommendation.id ? recommendation : item))
      writeCache({ recommendations: next, candidates: candidatesRef.current })
      return next
    })
  }, [])

  useEffect(() => {
    const cached = readCache()
    if (cached) {
      setRecommendations(cached.recommendations)
      setCandidates(cached.candidates)
      setLoading(false)
      return
    }

    let active = true
    void fetch('/api/discover')
      .then(async (response) => {
        const payload = (await response.json()) as {
          error?: string
          recommendations?: Recommendation[]
          candidates?: CandidateIssue[]
        }
        if (!response.ok) throw new Error(payload.error ?? 'Could not load previous recommendations.')
        if (!active) return
        const value = { recommendations: payload.recommendations ?? [], candidates: payload.candidates ?? [] }
        setRecommendations(value.recommendations)
        setCandidates(value.candidates)
        if (value.recommendations.length) writeCache(value)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load previous recommendations.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <DiscoveryContext.Provider value={{ recommendations, candidates, loading, stage, error, run, patchRecommendation }}>
      {children}
    </DiscoveryContext.Provider>
  )
}

export function useDiscovery() {
  const value = useContext(DiscoveryContext)
  if (!value) throw new Error('useDiscovery must be used within DiscoveryProvider')
  return value
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { recommendations: Recommendation[]; candidates: CandidateIssue[] }
  } catch {
    return null
  }
}

function writeCache(value: { recommendations: Recommendation[]; candidates: CandidateIssue[] }) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Ignore quota errors.
  }
}
