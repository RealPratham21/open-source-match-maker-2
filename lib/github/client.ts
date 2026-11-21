import { Octokit } from 'octokit'
import { DiscoveryError } from './types'
import { logDiscovery } from './log'

let client: Octokit | null = null

export function getGitHubToken() {
  const token = process.env.GITHUB_TOKEN?.trim()
  return token || null
}

export function getOctokit() {
  if (!client) {
    const token = getGitHubToken()
    if (!token) {
      logDiscovery('no GITHUB_TOKEN; using unauthenticated GitHub API (strict rate limits)')
    }
    client = new Octokit({
      auth: token ?? undefined,
      userAgent: 'contribmatch/0.1',
    })
  }
  return client
}

export function isRateLimit(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false
  const status = Number((error as { status: number }).status)
  return status === 403 || status === 429
}

export function toDiscoveryError(error: unknown) {
  if (error instanceof DiscoveryError) return error
  if (isRateLimit(error)) {
    return new DiscoveryError('rate_limit', 'GitHub rate limit reached. Try again in a few minutes.')
  }
  return new DiscoveryError('github', 'GitHub could not complete this search right now.')
}
