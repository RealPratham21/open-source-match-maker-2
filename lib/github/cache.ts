import type { SupabaseClient } from '@supabase/supabase-js'
import { ANALYSIS_CACHE_HOURS, ISSUE_CACHE_HOURS, REPO_CACHE_HOURS } from './constants'
import type { DiscoveredIssue, DiscoveredRepository, EnvironmentSignals } from './types'

function fresh(iso: string | null | undefined, hours: number) {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < hours * 60 * 60 * 1000
}

export async function getCachedRepository(supabase: SupabaseClient, githubId: number) {
  const { data, error } = await supabase.from('github_repositories').select('*').eq('github_id', githubId).maybeSingle()
  if (error || !data) return null
  if (!fresh(data.last_scanned_at, REPO_CACHE_HOURS)) return null
  return rowToRepo(data)
}

export async function upsertRepository(supabase: SupabaseClient, repo: DiscoveredRepository) {
  const { data, error } = await supabase
    .from('github_repositories')
    .upsert(
      {
        github_id: repo.githubId,
        owner: repo.owner,
        name: repo.name,
        full_name: repo.fullName,
        description: repo.description,
        url: repo.url,
        stars: repo.stars,
        primary_language: repo.primaryLanguage,
        topics: repo.topics,
        pushed_at: repo.lastPushedAt,
        health_score: repo.healthScore,
        raw_metadata: { forks: repo.forks, openIssues: repo.openIssues, hasIssues: repo.hasIssues },
        last_scanned_at: new Date().toISOString(),
      },
      { onConflict: 'github_id' },
    )
    .select('id')
    .single()
  if (error) return null
  return data.id as string
}

export async function getCachedIssues(supabase: SupabaseClient, repositoryId: string) {
  const { data, error } = await supabase.from('github_issues').select('*').eq('repository_id', repositoryId)
  if (error || !data?.length) return null
  if (!data.every((row) => fresh(row.last_scanned_at, ISSUE_CACHE_HOURS))) return null
  return data.map(rowToIssue)
}

export async function upsertIssues(supabase: SupabaseClient, repositoryId: string, issues: DiscoveredIssue[]) {
  if (issues.length === 0) return
  await supabase.from('github_issues').upsert(
    issues.map((issue) => ({
      github_id: issue.githubId,
      repository_id: repositoryId,
      issue_number: issue.number,
      title: issue.title,
      body: (issue.body ?? '').slice(0, 4000),
      url: issue.url,
      labels: issue.labels,
      assignees: issue.assignees,
      comments_count: issue.comments,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      claim_status: issue.assignees.length ? 'assigned' : 'unknown',
      last_scanned_at: new Date().toISOString(),
    })),
    { onConflict: 'github_id' },
  )
}

export async function getCachedAnalysis(supabase: SupabaseClient, repositoryId: string) {
  const { data, error } = await supabase.from('github_repository_analysis').select('*').eq('repository_id', repositoryId).maybeSingle()
  if (error || !data) return null
  if (!fresh(data.analysis_updated_at, ANALYSIS_CACHE_HOURS)) return null
  return {
    languages: data.languages ?? [],
    technologies: data.technologies ?? [],
    docker: Boolean(data.uses_docker),
    gpuLikelyRequired: Boolean(data.gpu_likely_required),
    infrastructure: data.infrastructure ?? [],
    setupFilesFound: data.setup_files_found ?? [],
  } satisfies EnvironmentSignals
}

export async function upsertAnalysis(supabase: SupabaseClient, repositoryId: string, environment: EnvironmentSignals) {
  await supabase.from('github_repository_analysis').upsert(
    {
      repository_id: repositoryId,
      languages: environment.languages,
      technologies: environment.technologies,
      infrastructure: environment.infrastructure,
      uses_docker: environment.docker,
      gpu_likely_required: environment.gpuLikelyRequired,
      setup_files_found: environment.setupFilesFound,
      analysis_updated_at: new Date().toISOString(),
    },
    { onConflict: 'repository_id' },
  )
}

export async function updateIssueClaim(supabase: SupabaseClient, githubId: number, claimStatus: string) {
  await supabase.from('github_issues').update({ claim_status: claimStatus, last_scanned_at: new Date().toISOString() }).eq('github_id', githubId)
}

function rowToRepo(row: Record<string, unknown>): DiscoveredRepository {
  const meta = (row.raw_metadata ?? {}) as { forks?: number; openIssues?: number; hasIssues?: boolean }
  return {
    githubId: Number(row.github_id),
    owner: String(row.owner),
    name: String(row.name),
    fullName: String(row.full_name),
    description: (row.description as string | null) ?? null,
    url: String(row.url),
    stars: Number(row.stars ?? 0),
    forks: meta.forks ?? 0,
    primaryLanguage: (row.primary_language as string | null) ?? null,
    topics: (row.topics as string[]) ?? [],
    lastPushedAt: String(row.pushed_at),
    archived: false,
    disabled: false,
    hasIssues: meta.hasIssues ?? true,
    openIssues: meta.openIssues ?? 0,
    healthScore: Number(row.health_score ?? 0),
    relevanceScore: Number(row.health_score ?? 0),
  }
}

function rowToIssue(row: Record<string, unknown>): DiscoveredIssue {
  return {
    githubId: Number(row.github_id),
    number: Number(row.issue_number),
    title: String(row.title),
    body: (row.body as string | null) ?? null,
    url: String(row.url),
    labels: (row.labels as string[]) ?? [],
    comments: Number(row.comments_count ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    assignees: (row.assignees as string[]) ?? [],
    author: null,
    isPullRequest: false,
  }
}
