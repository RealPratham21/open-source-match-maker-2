import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateIssue, DiscoveryProfile } from '@/lib/github/types'
import type { IssueBrief, Recommendation } from '@/lib/mock-data'

export async function createDiscoveryRun(supabase: SupabaseClient, userId: string, profile: DiscoveryProfile) {
  const { data, error } = await supabase
    .from('discovery_runs')
    .insert({ user_id: userId, profile_snapshot: profile, status: 'running' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function completeDiscoveryRun(
  supabase: SupabaseClient,
  runId: string,
  userId: string,
  candidates: CandidateIssue[],
  recommendations: Recommendation[],
) {
  if (recommendations.length) {
    const { error } = await supabase.from('recommendation_items').insert(
      recommendations.map((recommendation, index) => ({
        run_id: runId,
        user_id: userId,
        github_issue_id: recommendation.id,
        rank: index + 1,
        total_score: recommendation.match,
        score_breakdown: recommendation.analysis.scores,
        recommendation,
        candidate: candidates[index] ?? {},
      })),
    )
    if (error) throw error
  }

  const { error } = await supabase
    .from('discovery_runs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function failDiscoveryRun(supabase: SupabaseClient, runId: string, userId: string, message: string) {
  await supabase
    .from('discovery_runs')
    .update({ status: 'failed', error_message: message.slice(0, 500), completed_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('user_id', userId)
}

export async function getLatestRecommendations(supabase: SupabaseClient, userId: string) {
  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (runError) throw runError
  if (!run) return { recommendations: [] as Recommendation[], candidates: [] as CandidateIssue[] }

  const { data, error } = await supabase
    .from('recommendation_items')
    .select('recommendation, candidate')
    .eq('run_id', run.id)
    .eq('user_id', userId)
    .order('rank', { ascending: true })
  if (error) throw error

  return {
    recommendations: (data ?? []).map((row) => row.recommendation as Recommendation),
    candidates: (data ?? []).map((row) => row.candidate as CandidateIssue),
  }
}

export async function getRecommendation(supabase: SupabaseClient, userId: string, githubIssueId: number) {
  const { data, error } = await supabase
    .from('recommendation_items')
    .select('recommendation')
    .eq('user_id', userId)
    .eq('github_issue_id', githubIssueId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data) return data.recommendation as Recommendation

  const { data: saved, error: savedError } = await supabase
    .from('user_issue_states')
    .select('recommendation')
    .eq('user_id', userId)
    .eq('github_issue_id', githubIssueId)
    .maybeSingle()
  if (savedError) throw savedError
  return saved ? (saved.recommendation as Recommendation) : null
}

export async function getRecommendationRecord(supabase: SupabaseClient, userId: string, githubIssueId: number) {
  const { data, error } = await supabase
    .from('recommendation_items')
    .select('id, recommendation, candidate')
    .eq('user_id', userId)
    .eq('github_issue_id', githubIssueId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data) {
    return {
      itemId: data.id as string,
      recommendation: data.recommendation as Recommendation,
      candidate: (data.candidate ?? null) as CandidateIssue | null,
    }
  }

  const { data: saved, error: savedError } = await supabase
    .from('user_issue_states')
    .select('recommendation')
    .eq('user_id', userId)
    .eq('github_issue_id', githubIssueId)
    .maybeSingle()
  if (savedError) throw savedError
  if (!saved) return null
  return {
    itemId: null as string | null,
    recommendation: saved.recommendation as Recommendation,
    candidate: null as CandidateIssue | null,
  }
}

export async function saveRecommendationBrief(
  supabase: SupabaseClient,
  userId: string,
  githubIssueId: number,
  itemId: string | null,
  recommendation: Recommendation,
  brief: IssueBrief,
) {
  const next: Recommendation = {
    ...recommendation,
    analysis: {
      ...recommendation.analysis,
      brief,
    },
  }

  if (itemId) {
    const { error } = await supabase
      .from('recommendation_items')
      .update({ recommendation: next })
      .eq('id', itemId)
      .eq('user_id', userId)
    if (error) throw error
  }

  await supabase
    .from('user_issue_states')
    .update({ recommendation: next })
    .eq('user_id', userId)
    .eq('github_issue_id', githubIssueId)

  return next
}

