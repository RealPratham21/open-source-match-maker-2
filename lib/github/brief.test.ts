import { describe, expect, it } from 'vitest'
import { buildHeuristicBrief, parseIssueBrief } from './brief'
import { candidateToRecommendation } from './present'
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

const candidate: CandidateIssue = {
  repository: {
    id: 1,
    owner: 'example',
    name: 'project',
    fullName: 'example/project',
    description: 'A Python FastAPI backend',
    url: 'https://github.com/example/project',
    stars: 500,
    primaryLanguage: 'Python',
    topics: ['fastapi'],
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
    technologies: ['pytest'],
    docker: true,
    gpuLikelyRequired: false,
    infrastructure: [],
    setupFilesFound: ['README.md', 'pyproject.toml'],
  },
}

describe('issue briefs', () => {
  it('builds a heuristic brief from the issue body and setup files', () => {
    const brief = buildHeuristicBrief(candidate)
    expect(brief.source).toBe('heuristic')
    expect(brief.summary).toContain('validation error message')
    expect(brief.setup.some((item) => item.includes('README'))).toBe(true)
    expect(brief.approach.some((item) => item.toLowerCase().includes('reproduce'))).toBe(true)
    expect(brief.validate.some((item) => item.toLowerCase().includes('pytest'))).toBe(true)
  })

  it('attaches the brief when presenting a recommendation', () => {
    const recommendation = candidateToRecommendation(candidate, profile)
    expect(recommendation.analysis.brief?.summary).toContain('validation error message')
  })

  it('parses a Cohere JSON payload and keeps fallback lists when needed', () => {
    const fallback = buildHeuristicBrief(candidate)
    const parsed = parseIssueBrief(
      JSON.stringify({
        summary: 'Clarify the API validation error so callers know which field failed.',
        objective: 'Return a field-specific validation error and cover it with a regression test.',
        issueType: 'Bug fix',
        actionable: true,
        actionabilityReason: 'The issue defines a focused message change and expected regression coverage.',
        personalizedFit: ['You already use Python and FastAPI.'],
        prerequisites: ['Understand the existing validation path.'],
        setup: ['Create a virtualenv and install pyproject.toml dependencies.'],
        setupCommands: [],
        approachSteps: [{ title: 'Add a regression test', details: 'Write a failing test for the current error text, then update the message.' }],
        validate: ['Run pytest and confirm the new assertion.'],
        validationCommands: ['pytest tests/test_validation.py'],
        risks: [],
        gaps: [],
        evidenceUsed: ['Issue description', 'pyproject.toml'],
      }),
      fallback,
    )
    expect(parsed?.source).toBe('cohere')
    expect(parsed?.summary).toContain('validation error')
    expect(parsed?.approachSteps?.[0].title).toBe('Add a regression test')
    expect(parsed?.validationCommands).toEqual(['pytest tests/test_validation.py'])
  })

  it('rejects unusable model output', () => {
    expect(parseIssueBrief('not json', buildHeuristicBrief(candidate))).toBeNull()
  })

  it('does not present tracker issues as ready-to-implement tasks', () => {
    const brief = buildHeuristicBrief({
      ...candidate,
      issue: {
        ...candidate.issue,
        title: 'W8 thesis and reproducibility tracker',
        body: 'Type: wave tracker (not an implementation specification). Choose one of the linked implementation tasks.',
      },
    }, profile)
    expect(brief.issueType).toBe('Planning / tracker')
    expect(brief.actionable).toBe(false)
    expect(brief.gaps[0]).toContain('tracker')
  })
})
