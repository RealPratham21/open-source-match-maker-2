import type { Recommendation } from '@/lib/mock-data'
import { assessCandidate } from './assessment'
import { buildHeuristicBrief } from './brief'
import type { CandidateIssue, DiscoveryProfile } from './types'

export function candidateToRecommendation(candidate: CandidateIssue, profile: DiscoveryProfile): Recommendation {
  const assessment = assessCandidate(candidate, profile)
  const requirements = [
    ...candidate.environment.languages.map((item) => `${item} project`),
    ...candidate.environment.infrastructure,
    candidate.environment.docker ? 'Docker used in repo' : 'Docker not detected',
    candidate.environment.gpuLikelyRequired ? 'GPU likely required' : 'No GPU required',
  ]

  return {
    id: candidate.issue.id,
    repository: {
      name: candidate.repository.name,
      owner: candidate.repository.owner,
      language: candidate.repository.primaryLanguage ?? 'Unknown',
      stars: formatStars(candidate.repository.stars),
      activity: relativeTime(candidate.repository.lastPushedAt),
      description: candidate.repository.description ?? '',
    },
    issue: {
      id: candidate.issue.id,
      title: candidate.issue.title,
      labels: candidate.issue.labels.slice(0, 4),
      updated: relativeTime(candidate.issue.updatedAt),
      availability: claimLabel(candidate.preliminary.claimStatus),
      issueUrl: candidate.issue.url,
    },
    match: assessment.totalScore,
    why: assessment.reasons,
    stack: [...candidate.environment.languages, ...candidate.environment.technologies].slice(0, 6),
    analysis: {
      why: assessment.reasons.join(' '),
      scores: assessment.scores,
      difficulty: assessment.difficulty,
      confidence: assessment.confidence,
      scope: assessment.scope,
      expectedTime: assessment.implementationTime,
      setupTime: assessment.setupTime,
      implementationTime: assessment.implementationTime,
      requirements,
      skills: candidate.environment.languages,
      learn: assessment.learning.length ? assessment.learning : ['Repository conventions and contribution workflow'],
      challenges: assessment.warnings.length
        ? assessment.warnings.join(' ')
        : 'No material blocker was detected from the issue, repository setup files, or your profile.',
      health: [`Last push: ${relativeTime(candidate.repository.lastPushedAt)}`, `Stars: ${formatStars(candidate.repository.stars)}`],
      availability: [claimLabel(candidate.preliminary.claimStatus)],
      evidence: assessment.evidence,
      warnings: assessment.warnings,
      brief: buildHeuristicBrief(candidate, profile),
    },
  }
}

function claimLabel(status: CandidateIssue['preliminary']['claimStatus']) {
  if (status === 'assigned') return 'Assigned'
  if (status === 'possibly_claimed') return 'Possibly claimed'
  if (status === 'available') return 'No active assignee'
  return 'Availability unknown'
}

function formatStars(stars: number) {
  if (stars >= 1000) return `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(stars)
}

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime()
  const hours = Math.round(delta / 36e5)
  if (hours < 24) return `${Math.max(1, hours)} hours ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}
