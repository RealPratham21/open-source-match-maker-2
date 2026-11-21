'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, ChevronLeft, CircleHelp, ExternalLink, GitBranch, LoaderCircle, Sparkles, Terminal, Target } from 'lucide-react'
import { useDiscovery } from '@/components/discovery-state'
import { buttonVariants } from '@/components/ui/button'
import { Score } from '@/components/score'
import { cn } from '@/lib/utils'
import type { IssueBrief, Recommendation } from '@/lib/mock-data'

const briefRequests = new Set<number>()

export function AnalysisView({ issueId, initialRecommendation }: { issueId?: number; initialRecommendation?: Recommendation | null }) {
  const { recommendations, patchRecommendation } = useDiscovery()
  const [localRecommendation, setLocalRecommendation] = useState(initialRecommendation ?? null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const rec = recommendations.find((item) => item.id === issueId) ?? localRecommendation ?? initialRecommendation

  useEffect(() => {
    if (!rec || (rec.analysis.brief?.source === 'cohere' && rec.analysis.brief.version === 2) || briefRequests.has(rec.id)) return
    briefRequests.add(rec.id)
    let active = true
    setBriefLoading(true)
    setBriefError(null)
    void fetch('/api/analysis/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rec.id }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { recommendation?: Recommendation; upgraded?: boolean; error?: string }
        if (!response.ok || !payload.recommendation) {
          briefRequests.delete(rec.id)
          if (active) setBriefError(payload.error ?? 'The AI brief could not be generated. Reload the page to retry.')
          return
        }
        if (!active) return
        setLocalRecommendation(payload.recommendation)
        patchRecommendation(payload.recommendation)
        if (!payload.upgraded) setBriefError('Cohere was unavailable, so this is the evidence-based local brief. Reload the page to retry.')
      })
      .catch(() => {
        briefRequests.delete(rec.id)
        if (active) setBriefError('The AI brief request failed. Reload the page to retry.')
      })
      .finally(() => {
        if (active) setBriefLoading(false)
      })
    return () => {
      active = false
    }
  }, [rec?.id, rec?.analysis.brief?.source, rec?.analysis.brief?.version, patchRecommendation])

  if (!rec) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-10">
        <Link href="/discover" className="mb-8 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back to discover
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Issue not in this session</h1>
        <p className="mt-3 text-sm text-muted-foreground">Run discovery again from Discover, then open the analysis from a card.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:px-10">
      <Link href="/discover" className="mb-8 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to discover
      </Link>
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="size-4 shrink-0" />
            <span className="truncate">
              {rec.repository.owner} / {rec.repository.name}
            </span>
          </p>
          <h1 className="mt-3 max-w-2xl break-words text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] md:text-4xl">
            {rec.issue.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{rec.match}% Match</span>
            <span className="text-sm text-muted-foreground">Updated {rec.issue.updated}</span>
          </div>
        </div>
        <a href={rec.issue.issueUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline' }))}>
          Open on GitHub <ExternalLink data-icon="inline-end" />
        </a>
      </div>
      <div className="grid gap-8 py-10 md:grid-cols-[1.25fr_.75fr]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-lg font-semibold">Why this matches you</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{rec.analysis.why}</p>
          </section>
          <ContributorBrief brief={rec.analysis.brief} loading={briefLoading} error={briefError} />
          {rec.analysis.warnings && rec.analysis.warnings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Check before starting</h2>
              <ul className="mt-4 grid gap-3">
                {rec.analysis.warnings.map((warning) => (
                  <li key={warning} className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {rec.analysis.evidence && Object.keys(rec.analysis.evidence).length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Evidence behind the match</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(rec.analysis.evidence).map(([category, items]) => (
                  <div key={category} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-medium">{category}</p>
                    <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
                      {items.map((item) => (
                        <li key={`${item.source}-${item.label}`} className="flex gap-2">
                          <span className={item.impact === 'positive' ? 'text-primary' : item.impact === 'negative' ? 'text-amber-600' : ''}>•</span>
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-lg font-semibold">Environment requirements</h2>
            <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {rec.analysis.requirements.map((x) => (
                <li key={x} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="size-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold">What you&apos;ll learn</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {rec.analysis.learn.map((x) => (
                <span key={x} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
                  {x}
                </span>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Potential challenges</h2>
            <p className="mt-3 rounded-lg bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">{rec.analysis.challenges}</p>
          </section>
        </div>
        <aside className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">Match breakdown</h2>
              <CircleHelp className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-5">
              {Object.entries(rec.analysis.scores).map(([label, value]) => (
                <Score key={label} label={label} value={value} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Issue snapshot</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Difficulty</span>
                <span>{rec.analysis.difficulty}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Estimated scope</span>
                <span>{rec.analysis.scope}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Expected time</span>
                <span>{rec.analysis.expectedTime}</span>
              </p>
              {rec.analysis.setupTime && (
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Setup estimate</span>
                  <span>{rec.analysis.setupTime}</span>
                </p>
              )}
              {rec.analysis.confidence && (
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Estimate confidence</span>
                  <span>{rec.analysis.confidence}</span>
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-primary p-5 text-primary-foreground">
            <p className="text-sm font-medium">Ready to contribute?</p>
            <p className="mt-1 text-sm leading-6 opacity-80">This issue is open, active, and sized for your next focused session.</p>
            <a
              href={rec.issue.issueUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants(),
                'mt-5 w-full border border-white/20 bg-white text-primary shadow-sm hover:bg-slate-100 hover:text-primary [a]:hover:bg-slate-100 [a]:hover:text-primary',
              )}
            >
              Open issue
            </a>
          </div>
        </aside>
      </div>
    </main>
  )
}

function ContributorBrief({ brief, loading, error }: { brief?: IssueBrief; loading: boolean; error: string | null }) {
  if (!brief && !loading) return null
  const isAi = brief?.source === 'cohere' && brief.version === 2
  const approach = brief?.approachSteps?.length
    ? brief.approachSteps
    : brief?.approach.map((details, index) => ({ title: `Step ${index + 1}`, details })) ?? []
  const risks = brief?.risks?.length ? brief.risks : brief?.gaps ?? []
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold">Contributor brief</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAi ? 'Grounded in this issue, repository docs, discussion, and your profile.' : 'Evidence-based local draft.'}
              </p>
            </div>
          </div>
          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', isAi ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground')}>
            {isAi ? 'Cohere · repository grounded' : 'Local fallback'}
          </span>
        </div>
        {loading && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/15 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin text-primary" />
            Building a repository-grounded brief. The local draft remains visible while it loads.
          </div>
        )}
        {!loading && error && (
          <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> {error}
          </div>
        )}
      </div>
      <div className="grid gap-6 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {brief?.issueType && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{brief.issueType}</span>}
            {typeof brief?.actionable === 'boolean' && (
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', brief.actionable ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700')}>
                {brief.actionable ? 'Ready to investigate' : 'Needs scoping first'}
              </span>
            )}
          </div>
          {brief?.summary && <p className="mt-3 text-sm leading-7 text-muted-foreground">{brief.summary}</p>}
        </div>
        {brief?.objective && (
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Target className="size-3.5" /> Concrete objective</p>
            <p className="mt-2 text-sm leading-6">{brief.objective}</p>
            {brief.actionabilityReason && <p className="mt-2 text-xs leading-5 text-muted-foreground">{brief.actionabilityReason}</p>}
          </div>
        )}
        {(brief?.personalizedFit?.length || brief?.prerequisites?.length) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <BriefList title="Why it fits you" items={brief.personalizedFit} />
            <BriefList title="Know before starting" items={brief.prerequisites} />
          </div>
        ) : null}
        {approach.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Suggested approach</p>
            <ol className="mt-3 grid gap-3">
              {approach.map((step, index) => (
                <li key={`${step.title}-${index}`} className="flex gap-3 rounded-xl border border-border p-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                  <div className="min-w-0"><p className="text-sm font-medium">{step.title}</p><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{step.details}</p></div>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <BriefList title="Set up" items={brief?.setup} commands={brief?.setupCommands} />
          <BriefList title="Validate the change" items={brief?.validate} commands={brief?.validationCommands} />
        </div>
        {risks.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4 text-amber-600" /> Risks and open questions</p>
            <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">{risks.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
        )}
        {brief?.evidenceUsed?.length ? <p className="text-[11px] leading-5 text-muted-foreground">Evidence used: {brief.evidenceUsed.join(' · ')}</p> : null}
      </div>
    </section>
  )
}

function BriefList({
  title,
  items,
  commands,
  empty,
}: {
  title: string
  items?: string[]
  commands?: string[]
  empty?: string
}) {
  const values = items?.length ? items : empty ? [empty] : []
  if (!values.length && !commands?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
        {values.map((item) => (
          <li key={item} className="flex min-w-0 gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
          </li>
        ))}
      </ul>
      {commands?.length ? (
        <div className="mt-3 grid gap-2">
          {commands.map((command) => <code key={command} className="flex items-start gap-2 overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-100"><Terminal className="mt-0.5 size-3 shrink-0" />{command}</code>)}
        </div>
      ) : null}
    </div>
  )
}
