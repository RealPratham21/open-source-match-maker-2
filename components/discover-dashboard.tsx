'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from '@/components/recommendation-card'
import { useSavedIssues } from '@/components/saved-state'
import { useDiscovery } from '@/components/discovery-state'
import { StatusMessage } from '@/components/status'
import { firstName } from '@/lib/identity'

export function DiscoverDashboard({ displayName }: { displayName: string }) {
  const router = useRouter()
  const { saved, toggle } = useSavedIssues()
  const { recommendations, loading, stage, error, run } = useDiscovery()
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () =>
      recommendations.filter((r) =>
        `${r.repository.name} ${r.issue.title} ${r.repository.language}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, recommendations],
  )
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!loading && recommendations.length === 0 && !error) void run()
  }, [recommendations.length, loading, error, run])

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 md:px-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {hello}, {firstName(displayName)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Here are open-source issues that match your skills and setup.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void run(true)} disabled={loading}>
            {loading ? 'Searching…' : 'Refresh matches'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/profile')}>
            <Settings2 data-icon="inline-start" /> Tune profile
          </Button>
        </div>
      </div>
      <div className="mt-9 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories or issues"
            className="h-10 w-full rounded-md bg-muted/60 pl-10 pr-3 text-sm outline-none ring-primary focus:ring-2"
          />
        </div>
        {['Language: All', 'Difficulty: All', 'Contribution type: All', 'Sort: Best match'].map((x) => (
          <button key={x} className="hidden rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted md:block">
            {x}
          </button>
        ))}
        <button className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Filters">
          <Settings2 className="size-4" />
        </button>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{loading ? '—' : filtered.length}</span> opportunities ranked for you
        </p>
        <button className="text-xs font-medium text-muted-foreground hover:text-foreground">
          Learning value <ChevronRight className="inline size-3.5" />
        </button>
      </div>
      {error && (
        <div className="mt-4">
          <StatusMessage>{error}</StatusMessage>
        </div>
      )}
      {loading ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-sm font-medium text-foreground">{stage}</p>
          <p className="mt-2 text-sm text-muted-foreground">This uses live GitHub data and can take a few seconds.</p>
        </div>
      ) : filtered.length ? (
        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-3">
          {filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onAnalysis={() => router.push(`/analysis?id=${rec.id}`)}
              saved={saved.includes(rec.id)}
              onSave={() => void toggle(rec)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border p-16 text-center">
          <Search className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">No issues found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try refreshing matches, or add more languages and technologies to your profile.
          </p>
        </div>
      )}
    </main>
  )
}
