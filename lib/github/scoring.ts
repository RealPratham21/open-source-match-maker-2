import { CLAIM_COMMENT_PATTERNS, ISSUE_STALE_MONTHS, MAINTAINER_CLAIM_PATTERNS, MIN_ISSUE_BODY_LENGTH, PREFERRED_LABELS, REJECT_LABELS, REPO_ACTIVITY_MONTHS } from './constants'
import type { ClaimStatus, DiscoveryProfile, DiscoveredIssue, DiscoveredRepository, EnvironmentSignals } from './types'

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function monthsAgo(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30)
}

function haystack(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(' ').toLowerCase()
}

export function scoreRepository(
  repo: Omit<DiscoveredRepository, 'healthScore' | 'relevanceScore'>,
  profile: DiscoveryProfile,
) {
  const text = haystack([repo.description, repo.fullName, repo.primaryLanguage, ...repo.topics])
  const languageHit = profile.languages.some((lang) => repo.primaryLanguage?.toLowerCase() === lang.toLowerCase() || text.includes(lang.toLowerCase()))
  const learningHit = profile.learning_goals.some((goal) => text.includes(goal.toLowerCase()))
  const topicHits = profile.interests.filter((interest) => text.includes(interest.toLowerCase().replace(' / ', ' '))).length
  const techHits = profile.technologies.filter((tech) => text.includes(tech.toLowerCase())).length

  const relevance = clamp((languageHit ? 55 : 15) + (learningHit ? 15 : 0) + Math.min(20, topicHits * 8) + Math.min(20, techHits * 8))
  const freshness = clamp(100 - monthsAgo(repo.lastPushedAt) * (100 / REPO_ACTIVITY_MONTHS))
  const technology = clamp(20 + techHits * 25 + (repo.topics.length ? 10 : 0))
  const community = clamp(Math.log10(repo.stars + 1) * 22 + Math.log10(repo.forks + 1) * 8)
  const issues = repo.hasIssues && repo.openIssues > 0 ? 100 : repo.hasIssues ? 40 : 10

  const healthScore = clamp(relevance * 0.35 + freshness * 0.3 + technology * 0.2 + community * 0.1 + issues * 0.05)
  return { healthScore, relevanceScore: relevance }
}

export function isStaleRepository(pushedAt: string) {
  return monthsAgo(pushedAt) > REPO_ACTIVITY_MONTHS * 1.25
}

export type IssueFilterReason =
  | 'accepted'
  | 'pull_request'
  | 'assigned'
  | 'stale'
  | 'rejected_label'
  | 'meta_issue'
  | 'insufficient_description'
  | 'language_mismatch'

export function issueFilterReason(issue: DiscoveredIssue, repo: DiscoveredRepository, profile: DiscoveryProfile): IssueFilterReason {
  if (issue.isPullRequest) return 'pull_request'
  if (issue.assignees.length > 0) return 'assigned'
  if (monthsAgo(issue.updatedAt) > ISSUE_STALE_MONTHS) return 'stale'

  const labels = issue.labels.map((label) => label.toLowerCase())
  if (labels.some((label) => REJECT_LABELS.includes(label))) return 'rejected_label'

  const body = (issue.body ?? '').trim()
  const title = issue.title.toLowerCase()
  const metaText = `${title}\n${body}`
  if (/^(meta|rfc:|tracking issue|umbrella|status:)/.test(title) || /not an implementation specification|type:\s*(?:wave\s+)?tracker|this issue tracks\b/i.test(metaText)) return 'meta_issue'

  const preferred = labels.some((label) => PREFERRED_LABELS.includes(label))
  if (body.length < MIN_ISSUE_BODY_LENGTH && !preferred) return 'insufficient_description'

  const lang = repo.primaryLanguage?.toLowerCase()
  if (lang) {
    const known = [...profile.languages, ...profile.learning_goals].some((item) => item.toLowerCase() === lang)
    const techMatch = profile.technologies.some((tech) => haystack([repo.description, ...repo.topics, issue.title]).includes(tech.toLowerCase()))
    if (!known && !techMatch && profile.languages.length > 0) return 'language_mismatch'
  }

  return 'accepted'
}

export function filterIssue(issue: DiscoveredIssue, repo: DiscoveredRepository, profile: DiscoveryProfile) {
  return issueFilterReason(issue, repo, profile) === 'accepted'
}

export function claimStatusFromAssignees(assignees: string[]): ClaimStatus {
  return assignees.length > 0 ? 'assigned' : 'unknown'
}

export function claimStatusFromComments(comments: string[], authorLogins: string[], repoOwner: string): ClaimStatus {
  const joined = comments.join('\n')
  const volunteer = CLAIM_COMMENT_PATTERNS.some((pattern) => pattern.test(joined))
  const maintainer = comments.some((comment, index) => {
    const login = authorLogins[index]?.toLowerCase()
    if (login !== repoOwner.toLowerCase()) return false
    return MAINTAINER_CLAIM_PATTERNS.some((pattern) => pattern.test(comment))
  })
  if (maintainer) return 'possibly_claimed'
  if (volunteer) return 'possibly_claimed'
  return 'available'
}

export function scoreIssueRelevance(issue: DiscoveredIssue, repo: DiscoveredRepository, profile: DiscoveryProfile) {
  const text = haystack([issue.title, issue.body, ...issue.labels, repo.primaryLanguage, ...repo.topics])
  const language = profile.languages.some((lang) => text.includes(lang.toLowerCase())) ? 35 : 10
  const tech = Math.min(25, profile.technologies.filter((item) => text.includes(item.toLowerCase())).length * 12)
  const interest = Math.min(20, profile.interests.filter((item) => text.includes(item.toLowerCase().split('/')[0].trim())).length * 8)
  const preferred = issue.labels.some((label) => PREFERRED_LABELS.includes(label.toLowerCase())) ? 15 : 0
  const contribution = profile.contribution_types.some((type) => text.includes(type.toLowerCase().replace('fixes', 'fix'))) ? 8 : 0
  return clamp(language + tech + interest + preferred + contribution)
}

export function scoreMachineCompatibility(profile: DiscoveryProfile, environment: EnvironmentSignals) {
  let score = 88
  const noGpu = !profile.gpu || /no dedicated|none|n\/a/i.test(profile.gpu)
  if (environment.gpuLikelyRequired && noGpu) score -= 45
  if (environment.docker && profile.docker_available === false) score -= 25
  if ((profile.ram_gb ?? 16) < 8 && environment.infrastructure.includes('elasticsearch')) score -= 15
  return clamp(score)
}

export function availabilityScore(status: ClaimStatus) {
  if (status === 'available') return 100
  if (status === 'unknown') return 70
  if (status === 'possibly_claimed') return 45
  return 0
}

export function candidateRank(profileRelevance: number, repoHealth: number, machineCompatibility: number, claimStatus: ClaimStatus) {
  return profileRelevance * 0.4 + repoHealth * 0.3 + machineCompatibility * 0.2 + availabilityScore(claimStatus) * 0.1
}
