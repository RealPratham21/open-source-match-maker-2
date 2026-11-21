'use client'

import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { useSavedIssues } from '@/components/saved-state'
import { StatusMessage } from '@/components/status'

export function SavedView() {
  const router = useRouter()
  const { items, loading, error } = useSavedIssues()

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-10">
      <h1 className="text-3xl font-semibold tracking-tight">Saved issues</h1>
      <p className="mt-2 text-sm text-muted-foreground">Keep promising opportunities close while you decide what&apos;s next.</p>
      {error && (
        <div className="mt-6">
          <StatusMessage>{error}</StatusMessage>
        </div>
      )}
      {loading ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
          Loading saved issues…
        </div>
      ) : items.length ? (
        <div className="mt-8 flex flex-col gap-3">
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/analysis?id=${r.id}`)}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left hover:border-foreground/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {r.repository.owner} / {r.repository.name}
                </p>
                <h2 className="mt-1 line-clamp-2 break-words font-medium [overflow-wrap:anywhere]">{r.issue.title}</h2>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>{r.repository.language}</span>
                  <span>·</span>
                  <span>{r.analysis.difficulty}</span>
                  <span>·</span>
                  <span>Saved today</span>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{r.match}% match</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-border p-16 text-center">
          <Bookmark className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Nothing saved yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Bookmark an issue from Discover to see it here.</p>
        </div>
      )}
    </main>
  )
}
