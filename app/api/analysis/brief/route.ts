import { NextResponse } from 'next/server'
import { enrichIssueBrief, hasCohereKey } from '@/lib/cohere/brief'
import { buildHeuristicBrief } from '@/lib/github/brief'
import { loadIssueDiscussion } from '@/lib/github/issues'
import { loadContributorDocuments } from '@/lib/github/repository-files'
import { getRecommendationRecord, saveRecommendationBrief } from '@/lib/persistence/recommendations'
import { getProfile } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'
import type { CandidateIssue } from '@/lib/github/types'

export const maxDuration = 45

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view analysis.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { id?: number } | null
  const issueId = Number(body?.id)
  if (!Number.isFinite(issueId)) return NextResponse.json({ error: 'Invalid issue ID.' }, { status: 400 })

  try {
    const record = await getRecommendationRecord(supabase, user.id, issueId)
    if (!record) return NextResponse.json({ error: 'Issue not in this session.' }, { status: 404 })

    const existing = record.recommendation.analysis.brief
    if (existing?.source === 'cohere' && existing.version === 2) {
      return NextResponse.json({ recommendation: record.recommendation, upgraded: false })
    }

    const candidate = isCandidate(record.candidate) ? record.candidate : null
    const profile = await getProfile(supabase, user.id)
    const fallback = candidate ? buildHeuristicBrief(candidate, profile ?? undefined) : existing
    if (!fallback) return NextResponse.json({ recommendation: record.recommendation, upgraded: false })

    const canEnrich = Boolean(candidate && hasCohereKey())
    const [documents, comments] = candidate && canEnrich
      ? await Promise.all([
          loadContributorDocuments(candidate.repository, candidate.issue.body ?? ''),
          loadIssueDiscussion(candidate.repository, candidate.issue.number, candidate.issue.comments),
        ])
      : [[], []]
    const brief = candidate && canEnrich
      ? await enrichIssueBrief(candidate, fallback, { profile: profile ?? undefined, documents, comments })
      : fallback
    const recommendation = await saveRecommendationBrief(
      supabase,
      user.id,
      issueId,
      record.itemId,
      record.recommendation,
      brief,
    )
    return NextResponse.json({ recommendation, upgraded: brief.source === 'cohere' })
  } catch {
    return NextResponse.json({ error: 'Could not prepare the contributor brief.' }, { status: 500 })
  }
}

function isCandidate(value: CandidateIssue | null): value is CandidateIssue {
  return Boolean(value?.issue?.title && value?.repository?.fullName)
}
