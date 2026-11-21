import { NextResponse } from 'next/server'
import { discoverCandidateIssues } from '@/lib/github/discovery'
import { DiscoveryError, type DiscoveryProfile } from '@/lib/github/types'
import { candidateToRecommendation } from '@/lib/github/present'
import {
  completeDiscoveryRun,
  createDiscoveryRun,
  failDiscoveryRun,
  getLatestRecommendations,
} from '@/lib/persistence/recommendations'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export const maxDuration = 60

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view recommendations.' }, { status: 401 })

  try {
    return NextResponse.json(await getLatestRecommendations(supabase, user.id))
  } catch {
    return NextResponse.json({ error: 'Could not load previous recommendations.' }, { status: 500 })
  }
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to discover issues.' }, { status: 401 })
  }

  const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 })
  if (!data || !(data as Profile).onboarding_completed) {
    return NextResponse.json({ error: 'Complete onboarding before discovering issues.' }, { status: 409 })
  }
  const profile = toDiscoveryProfile(data as Profile)

  let runId: string
  try {
    runId = await createDiscoveryRun(supabase, user.id, profile)
  } catch {
    return NextResponse.json({ error: 'Could not start a discovery run.' }, { status: 500 })
  }

  try {
    const candidates = await discoverCandidateIssues(profile, supabase)
    const ranked = candidates
      .map((candidate) => ({ candidate, recommendation: candidateToRecommendation(candidate, profile) }))
      .sort((a, b) => b.recommendation.match - a.recommendation.match)
    const rankedCandidates = ranked.map((item) => item.candidate)
    const recommendations = ranked.map((item) => item.recommendation)
    await completeDiscoveryRun(supabase, runId, user.id, rankedCandidates, recommendations)
    return NextResponse.json({
      candidates: rankedCandidates,
      recommendations,
    })
  } catch (error) {
    await failDiscoveryRun(supabase, runId, user.id, error instanceof Error ? error.message : 'Discovery failed')
    if (error instanceof DiscoveryError) {
      const status = error.code === 'rate_limit' || error.code === 'github' || error.code === 'missing_token' ? 503 : 400
      return NextResponse.json({ error: error.message, code: error.code }, { status })
    }
    console.info('[discovery] unexpected failure')
    return NextResponse.json({ error: 'Discovery failed. Please try again.' }, { status: 500 })
  }
}

function toDiscoveryProfile(profile: Profile): DiscoveryProfile {
  return {
    languages: profile.languages ?? [],
    technologies: profile.technologies ?? [],
    interests: profile.interests ?? [],
    learning_goals: profile.learning_goals ?? [],
    contribution_types: profile.contribution_types ?? [],
    preferred_difficulty: profile.preferred_difficulty,
    available_time: profile.available_time,
    operating_system: profile.operating_system,
    ram_gb: profile.ram_gb,
    gpu: profile.gpu,
    docker_available: profile.docker_available,
    onboarding_completed: profile.onboarding_completed,
  }
}
