import { COMMENTS_PER_ISSUE, ISSUES_PER_REPO } from './constants'
import { getOctokit, toDiscoveryError } from './client'
import { logDiscovery } from './log'
import type { DiscoveredIssue, DiscoveredRepository } from './types'

export async function listOpenIssues(repo: DiscoveredRepository) {
  const octokit = getOctokit()
  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner: repo.owner,
      repo: repo.name,
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: ISSUES_PER_REPO,
      page: 1,
    })

    return data.map((issue) => mapIssue(issue)).filter((issue) => !issue.isPullRequest)
  } catch (error) {
    logDiscovery('issue list failed', { repo: repo.fullName })
    throw toDiscoveryError(error)
  }
}

export async function listRecentComments(repo: DiscoveredRepository, issueNumber: number) {
  const octokit = getOctokit()
  try {
    const { data } = await octokit.rest.issues.listComments({
      owner: repo.owner,
      repo: repo.name,
      issue_number: issueNumber,
      per_page: COMMENTS_PER_ISSUE,
      page: 1,
    })
    return data.map((comment) => ({
      body: comment.body ?? '',
      login: comment.user?.login ?? '',
    }))
  } catch (error) {
    logDiscovery('comment list failed', { repo: repo.fullName, issue: issueNumber })
    return []
  }
}

export async function loadIssueDiscussion(
  repo: Pick<DiscoveredRepository, 'owner' | 'name' | 'fullName'>,
  issueNumber: number,
  commentCount: number,
) {
  if (commentCount <= 0) return []
  const octokit = getOctokit()
  const perPage = 6
  const page = Math.max(1, Math.ceil(commentCount / perPage))
  try {
    const { data } = await octokit.rest.issues.listComments({
      owner: repo.owner,
      repo: repo.name,
      issue_number: issueNumber,
      per_page: perPage,
      page,
    })
    return data.map((comment) => ({
      author: comment.user?.login ?? 'unknown',
      body: (comment.body ?? '').slice(0, 1400),
    })).filter((comment) => comment.body.trim())
  } catch {
    logDiscovery('brief discussion skipped', { repo: repo.fullName, issue: issueNumber })
    return []
  }
}

function mapIssue(issue: {
  id: number
  number: number
  title: string
  body?: string | null
  html_url: string
  labels: Array<string | { name?: string }>
  comments: number
  created_at: string
  updated_at: string
  pull_request?: unknown
  user?: { login?: string } | null
  assignees?: Array<{ login?: string } | null> | null
}): DiscoveredIssue {
  return {
    githubId: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    url: issue.html_url,
    labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name ?? '')).filter(Boolean),
    comments: issue.comments,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    assignees: (issue.assignees ?? []).map((assignee) => assignee?.login ?? '').filter(Boolean),
    author: issue.user?.login ?? null,
    isPullRequest: Boolean(issue.pull_request),
  }
}
