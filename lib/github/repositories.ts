import { MAX_REPOS_PER_QUERY, REPO_ACTIVITY_MONTHS } from './constants'
import { getOctokit, toDiscoveryError } from './client'
import { logDiscovery } from './log'
import { isStaleRepository, scoreRepository } from './scoring'
import type { DiscoveryProfile, DiscoveredRepository } from './types'

type SearchItem = {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  forks_count?: number
  language: string | null
  topics?: string[]
  pushed_at: string | null
  archived: boolean
  disabled?: boolean
  has_issues?: boolean
  open_issues_count?: number
  owner?: { login?: string } | null
}

export async function searchRepositories(queries: string[], profile: DiscoveryProfile) {
  const octokit = getOctokit()
  const found: Array<Omit<DiscoveredRepository, 'healthScore' | 'relevanceScore'>> = []

  for (const q of queries) {
    try {
      const { data } = await octokit.rest.search.repos({
        q,
        sort: 'updated',
        order: 'desc',
        per_page: MAX_REPOS_PER_QUERY,
        page: 1,
      })
      for (const item of data.items as SearchItem[]) {
        const mapped = mapRepo(item)
        if (!mapped) continue
        found.push(mapped)
      }
    } catch (error) {
      logDiscovery('repository search failed', { query: q.slice(0, 80) })
      throw toDiscoveryError(error)
    }
  }

  const unique = new Map<number, DiscoveredRepository>()
  for (const repo of found) {
    if (repo.archived || repo.disabled) continue
    if (isStaleRepository(repo.lastPushedAt)) continue
    const scored = scoreRepository(repo, profile)
    unique.set(repo.githubId, { ...repo, ...scored })
  }

  logDiscovery('unique repositories', { count: unique.size })
  return [...unique.values()].sort((a, b) => b.healthScore - a.healthScore)
}

function mapRepo(item: SearchItem): Omit<DiscoveredRepository, 'healthScore' | 'relevanceScore'> | null {
  const owner = item.owner?.login ?? item.full_name.split('/')[0]
  const name = item.name
  if (!owner || !name || !item.pushed_at) return null
  return {
    githubId: item.id,
    owner,
    name,
    fullName: item.full_name,
    description: item.description,
    url: item.html_url,
    stars: item.stargazers_count ?? 0,
    forks: item.forks_count ?? 0,
    primaryLanguage: item.language,
    topics: item.topics ?? [],
    lastPushedAt: item.pushed_at,
    archived: item.archived,
    disabled: Boolean(item.disabled),
    hasIssues: item.has_issues !== false,
    openIssues: item.open_issues_count ?? 0,
  }
}

export function activityCutoffLabel() {
  return `${REPO_ACTIVITY_MONTHS} months`
}
