import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_CANDIDATES,
  MAX_CANDIDATES_PER_REPOSITORY,
  MAX_COMMENT_CHECKS,
  MAX_ENRICH_ISSUES,
  SHORTLIST_REPOS,
} from './constants'
import { getCachedAnalysis, getCachedIssues, updateIssueClaim, upsertAnalysis, upsertIssues, upsertRepository } from './cache'
import { listOpenIssues, listRecentComments } from './issues'
import { logDiscovery } from './log'
import { generateRepositoryQueries } from './queries'
import { analyzeRepositorySetup } from './repository-files'
import { searchRepositories } from './repositories'
import {
  candidateRank,
  claimStatusFromAssignees,
  claimStatusFromComments,
  issueFilterReason,
  scoreIssueRelevance,
  scoreMachineCompatibility,
} from './scoring'
import type { CandidateIssue, DiscoveryProfile, DiscoveredIssue, DiscoveredRepository, EnvironmentSignals } from './types'
import { DiscoveryError } from './types'

export async function discoverCandidateIssues(profile: DiscoveryProfile, supabase: SupabaseClient): Promise<CandidateIssue[]> {
  const working = withFallbackProfile(profile)
  logDiscovery('profile loaded', {
    languages: working.languages.length,
    technologies: working.technologies.length,
  })
  const queries = generateRepositoryQueries(working)
  logDiscovery('generated repository queries', { count: queries.length })

  const repositories = await searchRepositories(queries, working)
  logDiscovery('repositories returned', { count: repositories.length })
  if (repositories.length === 0) {
    throw new DiscoveryError('no_repositories', 'No active repositories matched your profile.')
  }

  const shortlist = repositories.slice(0, SHORTLIST_REPOS)
  logDiscovery('repositories shortlisted', { count: shortlist.length })

  let fetchedIssues = 0
  const collected: Array<{ repo: DiscoveredRepository; issue: DiscoveredIssue; repoRowId: string | null }> = []
  const filterCounts: Record<string, number> = {}

  for (const repo of shortlist) {
    const repoRowId = await safe(() => upsertRepository(supabase, repo))
    const cachedIssues = repoRowId ? await safe(() => getCachedIssues(supabase, repoRowId)) : null
    const issues = cachedIssues ?? (await listOpenIssues(repo))
    fetchedIssues += issues.length
    if (!cachedIssues && repoRowId) await safe(() => upsertIssues(supabase, repoRowId, issues))
    for (const issue of issues) {
      const reason = issueFilterReason(issue, repo, working)
      filterCounts[reason] = (filterCounts[reason] ?? 0) + 1
      if (reason === 'accepted') collected.push({ repo, issue, repoRowId })
    }
  }

  logDiscovery('open issues fetched', { count: fetchedIssues })
  logDiscovery('issue filter funnel', filterCounts)
  logDiscovery('issues survived filtering', { count: collected.length })
  if (collected.length === 0) {
    throw new DiscoveryError('no_issues', 'No suitable open issues were found in the shortlisted repositories.')
  }

  const ranked = collected
    .map((item) => ({
      ...item,
      relevance: scoreIssueRelevance(item.issue, item.repo, working),
    }))
    .sort((a, b) => b.relevance - a.relevance)

  const enrich = ranked.slice(0, MAX_ENRICH_ISSUES)
  const envByRepo = new Map<number, EnvironmentSignals>()

  for (const item of uniqueRepos(enrich.map((row) => row.repo))) {
    const rowId = (await safe(() => upsertRepository(supabase, item))) ?? null
    const cached = rowId ? await safe(() => getCachedAnalysis(supabase, rowId)) : null
    const environment = cached ?? (await analyzeRepositorySetup(item))
    envByRepo.set(item.githubId, environment)
    if (!cached && rowId) await safe(() => upsertAnalysis(supabase, rowId, environment))
  }

  logDiscovery('candidates enriched', { count: enrich.length })

  const candidates: CandidateIssue[] = []
  for (const [index, item] of enrich.entries()) {
    let claimStatus = claimStatusFromAssignees(item.issue.assignees)
    if (claimStatus !== 'assigned' && index < MAX_COMMENT_CHECKS) {
      const comments = await listRecentComments(item.repo, item.issue.number)
      claimStatus = claimStatusFromComments(
        comments.map((comment) => comment.body),
        comments.map((comment) => comment.login),
        item.repo.owner,
      )
      if (item.repoRowId) await safe(() => updateIssueClaim(supabase, item.issue.githubId, claimStatus))
    } else if (claimStatus !== 'assigned') {
      claimStatus = 'unknown'
    }

    const environment = envByRepo.get(item.repo.githubId) ?? fallbackEnvironment(item.repo)
    const machineCompatibility = scoreMachineCompatibility(working, environment)
    candidates.push({
      repository: {
        id: item.repo.githubId,
        owner: item.repo.owner,
        name: item.repo.name,
        fullName: item.repo.fullName,
        description: item.repo.description,
        url: item.repo.url,
        stars: item.repo.stars,
        primaryLanguage: item.repo.primaryLanguage,
        topics: item.repo.topics,
        lastPushedAt: item.repo.lastPushedAt,
        healthScore: item.repo.healthScore,
      },
      issue: {
        id: item.issue.githubId,
        number: item.issue.number,
        title: item.issue.title,
        body: item.issue.body,
        url: item.issue.url,
        labels: item.issue.labels,
        comments: item.issue.comments,
        createdAt: item.issue.createdAt,
        updatedAt: item.issue.updatedAt,
        assignees: item.issue.assignees,
        author: item.issue.author,
      },
      preliminary: {
        profileRelevance: item.relevance,
        repoHealth: item.repo.healthScore,
        machineCompatibility,
        claimStatus,
      },
      environment,
    })
  }

  const sorted = candidates.sort(
      (a, b) =>
        candidateRank(b.preliminary.profileRelevance, b.preliminary.repoHealth, b.preliminary.machineCompatibility, b.preliminary.claimStatus) -
        candidateRank(a.preliminary.profileRelevance, a.preliminary.repoHealth, a.preliminary.machineCompatibility, a.preliminary.claimStatus),
    )
  const selected = selectDiverseCandidates(sorted)
  logDiscovery('diverse recommendations selected', { count: selected.length })
  return selected
}

export function selectDiverseCandidates(
  candidates: CandidateIssue[],
  maximum = MAX_CANDIDATES,
  maximumPerRepository = MAX_CANDIDATES_PER_REPOSITORY,
) {
  const selected: CandidateIssue[] = []
  const perRepository = new Map<number, number>()
  for (const candidate of candidates) {
    const count = perRepository.get(candidate.repository.id) ?? 0
    if (count >= maximumPerRepository) continue
    selected.push(candidate)
    perRepository.set(candidate.repository.id, count + 1)
    if (selected.length >= maximum) break
  }
  return selected
}

function withFallbackProfile(profile: DiscoveryProfile): DiscoveryProfile {
  return {
    ...profile,
    languages: profile.languages.length ? profile.languages : ['TypeScript', 'Python'],
    technologies: profile.technologies.length ? profile.technologies : ['React', 'Next.js'],
    interests: profile.interests.length ? profile.interests : ['Backend', 'Developer Tools'],
    onboarding_completed: true,
    docker_available: profile.docker_available ?? true,
    gpu: profile.gpu ?? 'No dedicated GPU',
    ram_gb: profile.ram_gb ?? 16,
  }
}

function uniqueRepos(repos: DiscoveredRepository[]) {
  const map = new Map<number, DiscoveredRepository>()
  for (const repo of repos) map.set(repo.githubId, repo)
  return [...map.values()]
}

function fallbackEnvironment(repo: DiscoveredRepository): EnvironmentSignals {
  return {
    languages: repo.primaryLanguage ? [repo.primaryLanguage] : [],
    technologies: [],
    docker: false,
    gpuLikelyRequired: false,
    infrastructure: [],
    setupFilesFound: [],
  }
}

async function safe<T>(fn: () => Promise<T | null>) {
  try {
    return await fn()
  } catch {
    return null
  }
}
