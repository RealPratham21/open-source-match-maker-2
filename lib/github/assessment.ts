import type { AssessmentEvidence, Confidence, Difficulty } from '../mock-data'
import { availabilityScore } from './scoring'
import type { CandidateIssue, DiscoveryProfile } from './types'

export type CandidateAssessment = {
  totalScore: number
  difficulty: Difficulty
  confidence: Confidence
  scope: string
  setupTime: string
  implementationTime: string
  scores: Record<string, number>
  evidence: Record<string, AssessmentEvidence[]>
  reasons: string[]
  warnings: string[]
  learning: string[]
}

const COMPLEX_TERMS = [
  'architecture',
  'breaking change',
  'concurrency',
  'distributed',
  'migration',
  'performance',
  'race condition',
  'refactor',
  'security',
]

const FOCUSED_TERMS = ['documentation', 'typo', 'error message', 'test', 'validation', 'copy', 'readme']

export function assessCandidate(candidate: CandidateIssue, profile: DiscoveryProfile): CandidateAssessment {
  const difficulty = assessDifficulty(candidate)
  const skill = assessSkillFit(candidate, profile)
  const learning = assessLearningValue(candidate, profile)
  const setup = assessSetupFit(candidate, profile)
  const effort = estimateEffort(candidate, skill.score, difficulty.value, difficulty.confidence)
  const scope = assessScopeFit(profile.available_time, effort.implementationMax)
  const availability = assessAvailability(candidate)
  const repositoryHealth = {
    score: candidate.preliminary.repoHealth,
    evidence: [
      evidence(
        `Repository health is ${candidate.preliminary.repoHealth}/100 based on activity, relevance and community signals.`,
        'repository',
        candidate.preliminary.repoHealth >= 65 ? 'positive' : 'neutral',
      ),
    ],
  }
  const machine = assessMachineFit(candidate, profile)

  const scores = {
    'Skill Match': skill.score,
    'Issue Availability': availability.score,
    'Repository Health': repositoryHealth.score,
    'Learning Value': learning.score,
    'Machine Compatibility': machine.score,
    'Scope Fit': scope.score,
    'Setup Fit': setup.score,
  }
  const totalScore = clamp(
    skill.score * 0.3 +
      availability.score * 0.15 +
      repositoryHealth.score * 0.15 +
      learning.score * 0.15 +
      machine.score * 0.1 +
      scope.score * 0.1 +
      setup.score * 0.05,
  )

  const warnings = unique([
    ...availability.warnings,
    ...machine.warnings,
    ...setup.warnings,
    ...scope.warnings,
    ...(skill.score < 45 ? ['Few direct skill matches were found in the available GitHub metadata.'] : []),
  ])
  const reasons = unique([
    ...skill.reasons,
    ...learning.reasons,
    ...availability.reasons,
    ...scope.reasons,
    ...machine.reasons,
  ]).slice(0, 5)

  return {
    totalScore,
    difficulty: difficulty.value,
    confidence: minimumConfidence([difficulty.confidence, effort.confidence]),
    scope: effort.implementationMax <= 4 ? 'Small' : effort.implementationMax <= 8 ? 'Medium' : 'Large',
    setupTime: formatHours(effort.setupMin, effort.setupMax),
    implementationTime: formatHours(effort.implementationMin, effort.implementationMax),
    scores,
    evidence: {
      'Skill Match': skill.evidence,
      'Issue Availability': availability.evidence,
      'Repository Health': repositoryHealth.evidence,
      'Learning Value': learning.evidence,
      'Machine Compatibility': machine.evidence,
      'Scope Fit': scope.evidence,
      'Setup Fit': setup.evidence,
      Difficulty: difficulty.evidence,
    },
    reasons: reasons.length ? reasons : ['The issue passed the project’s availability and repository-quality checks.'],
    warnings,
    learning: learning.items,
  }
}

function assessDifficulty(candidate: CandidateIssue) {
  const labels = candidate.issue.labels.map(normalize)
  const text = normalize(`${candidate.issue.title} ${candidate.issue.body ?? ''}`)
  const evidenceItems: AssessmentEvidence[] = []
  let complexity = 42
  let signals = 0

  if (labels.includes('good first issue')) {
    complexity -= 22
    signals++
    evidenceItems.push(evidence('GitHub labels this as a good first issue.', 'issue', 'positive'))
  }
  if (labels.some((label) => ['documentation', 'docs'].includes(label))) {
    complexity -= 18
    signals++
    evidenceItems.push(evidence('The issue is documentation-focused.', 'issue', 'positive'))
  }
  if (labels.some((label) => ['tests', 'testing'].includes(label)) || FOCUSED_TERMS.some((term) => text.includes(term))) {
    complexity -= 8
    signals++
    evidenceItems.push(evidence('The issue appears focused on tests, validation, documentation or messaging.', 'issue', 'positive'))
  }

  const complexHits = COMPLEX_TERMS.filter((term) => text.includes(term))
  if (complexHits.length) {
    complexity += Math.min(30, complexHits.length * 10)
    signals += complexHits.length
    evidenceItems.push(evidence(`Complexity signals: ${complexHits.slice(0, 3).join(', ')}.`, 'issue', 'negative'))
  }
  if (candidate.environment.infrastructure.length >= 2) {
    complexity += 12
    signals++
    evidenceItems.push(evidence('The repository uses multiple infrastructure services.', 'setup', 'negative'))
  }
  if (candidate.environment.gpuLikelyRequired) {
    complexity += 15
    signals++
    evidenceItems.push(evidence('Repository setup signals suggest GPU-specific work.', 'setup', 'negative'))
  }
  if ((candidate.issue.body ?? '').trim().length >= 250) {
    signals++
    evidenceItems.push(evidence('The issue contains enough detail to assess its scope.', 'issue', 'positive'))
  }

  const score = clamp(complexity)
  const value: Difficulty = score <= 30 ? 'Beginner' : score <= 65 ? 'Intermediate' : 'Challenging'
  return { value, confidence: confidenceFromSignals(signals), evidence: evidenceItems }
}

function assessSkillFit(candidate: CandidateIssue, profile: DiscoveryProfile) {
  const known = unique([...profile.languages, ...profile.technologies])
  const repoSkills = unique([
    candidate.repository.primaryLanguage ?? '',
    ...candidate.environment.languages,
    ...candidate.environment.technologies,
  ]).filter(Boolean)
  const matches = repoSkills.filter((skill) => includesNormalized(known, skill))
  const issueMatches = known.filter((skill) => normalize(`${candidate.issue.title} ${candidate.issue.body ?? ''}`).includes(normalize(skill)))
  let score = 20 + Math.min(50, matches.length * 22) + Math.min(20, issueMatches.length * 8)
  if (candidate.repository.primaryLanguage && includesNormalized(profile.languages, candidate.repository.primaryLanguage)) score += 10
  score = clamp(score)

  const evidenceItems = matches.map((skill) => evidence(`${skill} matches your profile.`, 'profile', 'positive'))
  if (!matches.length) evidenceItems.push(evidence('No exact repository-stack match was found in your profile.', 'profile', 'negative'))
  return {
    score,
    evidence: evidenceItems,
    reasons: matches.slice(0, 2).map((skill) => `${skill} matches a skill already listed in your profile.`),
  }
}

function assessLearningValue(candidate: CandidateIssue, profile: DiscoveryProfile) {
  const text = normalize([
    candidate.repository.description,
    ...candidate.repository.topics,
    candidate.issue.title,
    candidate.issue.body,
    ...candidate.environment.languages,
    ...candidate.environment.technologies,
  ].filter(Boolean).join(' '))
  const goals = profile.learning_goals.filter((goal) => text.includes(normalize(goal)))
  const known = unique([...profile.languages, ...profile.technologies])
  const stack = unique([...candidate.environment.languages, ...candidate.environment.technologies])
  const newSkills = stack.filter((skill) => !includesNormalized(known, skill))
  const balancedUnknowns = Math.min(newSkills.length, 2)
  const score = clamp(50 + goals.length * 25 + balancedUnknowns * 10 - Math.max(0, newSkills.length - 3) * 10)
  const evidenceItems: AssessmentEvidence[] = [
    ...goals.map((goal) => evidence(`${goal} matches a learning goal.`, 'profile', 'positive')),
    ...newSkills.slice(0, 3).map((skill) => evidence(`${skill} would be a new skill to practise.`, 'setup', 'neutral')),
  ]
  return {
    score,
    evidence: evidenceItems.length ? evidenceItems : [evidence('The work mostly reinforces your existing stack.', 'profile', 'neutral')],
    reasons: goals.map((goal) => `This issue supports your ${goal} learning goal.`),
    items: unique([...goals, ...newSkills]).slice(0, 5),
  }
}

function assessSetupFit(candidate: CandidateIssue, profile: DiscoveryProfile) {
  let score = 78
  const evidenceItems: AssessmentEvidence[] = []
  const warnings: string[] = []
  const setupFiles = candidate.environment.setupFilesFound.map(normalize)
  const hasGuide = setupFiles.some((file) => file.includes('readme') || file.includes('contributing'))
  if (hasGuide) {
    score += 12
    evidenceItems.push(evidence('README or contributing guidance was detected.', 'setup', 'positive'))
  } else {
    score -= 18
    evidenceItems.push(evidence('No README or contributing guide was detected during setup analysis.', 'setup', 'negative'))
    warnings.push('Setup confidence is lower because no README or contributing guide was detected.')
  }
  if (candidate.environment.docker) {
    if (profile.docker_available) {
      score += 5
      evidenceItems.push(evidence('The repository uses Docker and your profile says Docker is available.', 'profile', 'positive'))
    } else {
      score -= 30
      evidenceItems.push(evidence('The repository uses Docker but your profile says it is unavailable.', 'profile', 'negative'))
      warnings.push('Docker appears to be part of the repository setup, but your profile says it is unavailable.')
    }
  }
  if (candidate.environment.infrastructure.length) {
    score -= Math.min(24, candidate.environment.infrastructure.length * 6)
    evidenceItems.push(evidence(`Setup includes ${candidate.environment.infrastructure.join(', ')}.`, 'setup', 'neutral'))
  }
  return { score: clamp(score), evidence: evidenceItems, warnings }
}

function assessMachineFit(candidate: CandidateIssue, profile: DiscoveryProfile) {
  const score = candidate.preliminary.machineCompatibility
  const evidenceItems: AssessmentEvidence[] = []
  const warnings: string[] = []
  const noGpu = !profile.gpu || /no dedicated|none|n\/a/i.test(profile.gpu)
  if (candidate.environment.gpuLikelyRequired && noGpu) {
    evidenceItems.push(evidence('GPU signals conflict with your no-GPU profile.', 'profile', 'negative'))
    warnings.push('This repository may require a GPU that is not listed in your profile.')
  } else {
    evidenceItems.push(evidence('No machine-blocking requirement was detected.', 'setup', 'positive'))
  }
  return {
    score,
    evidence: evidenceItems,
    warnings,
    reasons: score >= 80 ? ['No machine compatibility blocker was detected.'] : [],
  }
}

function assessAvailability(candidate: CandidateIssue) {
  const status = candidate.preliminary.claimStatus
  const score = availabilityScore(status)
  if (status === 'available') {
    return {
      score,
      evidence: [evidence('No assignee or claim comment was detected.', 'issue', 'positive')],
      reasons: ['No assignee or recent claim comment was detected.'],
      warnings: [] as string[],
    }
  }
  if (status === 'possibly_claimed') {
    return {
      score,
      evidence: [evidence('A recent comment may indicate that someone is working on this.', 'issue', 'negative')],
      reasons: [] as string[],
      warnings: ['Someone may already be working on this issue; verify the latest GitHub discussion.'],
    }
  }
  return {
    score,
    evidence: [evidence('Availability could not be confirmed from the comments checked.', 'issue', 'neutral')],
    reasons: [] as string[],
    warnings: ['Issue availability is uncertain; verify the latest GitHub discussion before starting.'],
  }
}

function estimateEffort(candidate: CandidateIssue, skillScore: number, difficulty: Difficulty, confidence: Confidence) {
  const base = difficulty === 'Beginner' ? [2, 4] : difficulty === 'Intermediate' ? [4, 8] : [8, 16]
  let implementationMin = base[0]
  let implementationMax = base[1]
  if (skillScore >= 80) implementationMax *= 0.85
  if (skillScore < 50) implementationMax *= 1.25

  let setupMin = candidate.environment.setupFilesFound.length ? 0.5 : 1
  let setupMax = candidate.environment.setupFilesFound.length >= 2 ? 1 : 2
  setupMax += candidate.environment.infrastructure.length * 0.5
  if (candidate.environment.docker) setupMax += 0.5

  return {
    setupMin: roundHalf(setupMin),
    setupMax: roundHalf(setupMax),
    implementationMin: roundHalf(implementationMin),
    implementationMax: roundHalf(implementationMax),
    confidence,
  }
}

function assessScopeFit(availableTime: string | null, implementationMax: number) {
  const availableMax = maximumHours(availableTime)
  if (!availableMax) {
    return {
      score: 65,
      evidence: [evidence('No parseable time budget was available.', 'profile', 'neutral')],
      reasons: [] as string[],
      warnings: [] as string[],
    }
  }
  const fits = implementationMax <= availableMax
  return {
    score: fits ? 95 : implementationMax <= availableMax * 1.5 ? 60 : 25,
    evidence: [
      evidence(
        fits
          ? `The estimated work fits your ${availableTime} availability.`
          : `The estimate may exceed your ${availableTime} availability.`,
        'profile',
        fits ? 'positive' : 'negative',
      ),
    ],
    reasons: fits ? [`The estimated implementation fits your ${availableTime} time budget.`] : [],
    warnings: fits ? [] : [`The estimated implementation may exceed your ${availableTime} time budget.`],
  }
}

function confidenceFromSignals(signals: number): Confidence {
  return signals >= 4 ? 'High' : signals >= 2 ? 'Medium' : 'Low'
}

function minimumConfidence(values: Confidence[]): Confidence {
  const rank: Record<Confidence, number> = { Low: 0, Medium: 1, High: 2 }
  return values.reduce((lowest, value) => (rank[value] < rank[lowest] ? value : lowest), 'High')
}

function maximumHours(value: string | null) {
  if (!value) return null
  const values = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
  return values.length ? Math.max(...values) : null
}

function formatHours(min: number, max: number) {
  const format = (hours: number) => (hours < 1 ? `${Math.round(hours * 60)} min` : `${hours} hr`)
  return `${format(min)}–${format(max)}`
}

function evidence(label: string, source: AssessmentEvidence['source'], impact: AssessmentEvidence['impact']): AssessmentEvidence {
  return { label, source, impact }
}

function includesNormalized(values: string[], target: string) {
  return values.some((value) => normalize(value) === normalize(target))
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function roundHalf(value: number) {
  return Math.max(0.5, Math.round(value * 2) / 2)
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

