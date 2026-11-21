import { describe, expect, it } from 'vitest'
import { assessCandidate } from './assessment'
import type { CandidateIssue, DiscoveryProfile } from './types'

const profile: DiscoveryProfile = {
  languages: ['Python'],
  technologies: ['FastAPI'],
  interests: ['Backend'],
  learning_goals: ['Go'],
  contribution_types: ['Bug fixes'],
  preferred_difficulty: 'Intermediate',
  available_time: '2–5 hours',
  operating_system: 'Windows 11',
  ram_gb: 16,
  gpu: 'No dedicated GPU',
  docker_available: true,
  onboarding_completed: true,
}

function candidate(overrides: Partial<CandidateIssue> = {}): CandidateIssue {
  const base: CandidateIssue = {
    repository: {
      id: 1,
      owner: 'example',
      name: 'project',
      fullName: 'example/project',
      description: 'A Python FastAPI backend',
      url: 'https://github.com/example/project',
      stars: 500,
      primaryLanguage: 'Python',
      topics: ['fastapi', 'backend'],
      lastPushedAt: new Date().toISOString(),
      healthScore: 80,
    },
    issue: {
      id: 10,
      number: 10,
      title: 'Improve validation error message',
      body: 'Add a regression test and update the validation error message with clear acceptance criteria.',
      url: 'https://github.com/example/project/issues/10',
      labels: ['good first issue', 'bug'],
      comments: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignees: [],
      author: 'contributor',
    },
    preliminary: {
      profileRelevance: 85,
      repoHealth: 80,
      machineCompatibility: 95,
      claimStatus: 'available',
    },
    environment: {
      languages: ['Python'],
      technologies: ['FastAPI'],
      docker: true,
      gpuLikelyRequired: false,
      infrastructure: [],
      setupFilesFound: ['README.md', 'pyproject.toml', 'Dockerfile'],
    },
  }
  return {
    ...base,
    ...overrides,
    repository: { ...base.repository, ...overrides.repository },
    issue: { ...base.issue, ...overrides.issue },
    preliminary: { ...base.preliminary, ...overrides.preliminary },
    environment: { ...base.environment, ...overrides.environment },
  }
}

describe('assessCandidate', () => {
  it('classifies a focused good-first issue as beginner with evidence', () => {
    const result = assessCandidate(candidate(), profile)
    expect(result.difficulty).toBe('Beginner')
    expect(result.scores['Skill Match']).toBeGreaterThanOrEqual(70)
    expect(result.evidence.Difficulty.length).toBeGreaterThan(0)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('marks architecture and migration work as challenging', () => {
    const result = assessCandidate(
      candidate({
        issue: {
          ...candidate().issue,
          labels: ['performance'],
          title: 'Refactor distributed architecture for concurrent migration',
          body: 'This breaking change requires a security review, a database migration, and performance work across services.',
        },
        environment: { ...candidate().environment, infrastructure: ['PostgreSQL', 'Redis', 'Kafka'] },
      }),
      profile,
    )
    expect(result.difficulty).toBe('Challenging')
    expect(result.implementationTime).not.toContain('Not estimated')
  })

  it('warns when GPU requirements conflict with the profile', () => {
    const result = assessCandidate(
      candidate({ environment: { ...candidate().environment, gpuLikelyRequired: true } }),
      profile,
    )
    expect(result.warnings.some((warning) => warning.toLowerCase().includes('gpu'))).toBe(true)
  })

  it('lowers scope fit when the estimated work exceeds availability', () => {
    const result = assessCandidate(
      candidate({
        issue: {
          ...candidate().issue,
          labels: ['performance'],
          title: 'Architecture migration and distributed concurrency refactor',
          body: 'A breaking security-sensitive migration across multiple services and data stores.',
        },
      }),
      profile,
    )
    expect(result.scores['Scope Fit']).toBeLessThan(60)
  })

  it('is deterministic for identical inputs', () => {
    const value = candidate()
    expect(assessCandidate(value, profile)).toEqual(assessCandidate(value, profile))
  })
})

