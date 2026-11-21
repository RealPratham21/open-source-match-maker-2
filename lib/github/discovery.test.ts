import { describe, expect, it } from 'vitest'
import { selectDiverseCandidates } from './discovery'
import { generateRepositoryQueries } from './queries'
import type { CandidateIssue, DiscoveryProfile } from './types'

const profile: DiscoveryProfile = {
  languages: ['Python'],
  technologies: ['FastAPI'],
  interests: ['Backend', 'AI / ML'],
  learning_goals: ['Go'],
  contribution_types: [],
  preferred_difficulty: null,
  available_time: '2–5 hours',
  operating_system: 'Windows',
  ram_gb: 16,
  gpu: null,
  docker_available: true,
  onboarding_completed: true,
}

function item(id: number, repositoryId: number): CandidateIssue {
  return {
    repository: {
      id: repositoryId,
      owner: 'owner',
      name: `repo-${repositoryId}`,
      fullName: `owner/repo-${repositoryId}`,
      description: null,
      url: '',
      stars: 1,
      primaryLanguage: 'Python',
      topics: [],
      lastPushedAt: new Date().toISOString(),
      healthScore: 70,
    },
    issue: {
      id,
      number: id,
      title: `Issue ${id}`,
      body: 'Enough detail for a candidate issue.',
      url: '',
      labels: [],
      comments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignees: [],
      author: null,
    },
    preliminary: { profileRelevance: 70, repoHealth: 70, machineCompatibility: 90, claimStatus: 'available' },
    environment: { languages: ['Python'], technologies: [], docker: false, gpuLikelyRequired: false, infrastructure: [], setupFilesFound: [] },
  }
}

describe('candidate breadth', () => {
  it('always includes a broad language query alongside targeted queries', () => {
    const queries = generateRepositoryQueries(profile)
    expect(queries.some((query) => query.startsWith('language:Python is:public'))).toBe(true)
    expect(queries.some((query) => query.includes('language:Python backend'))).toBe(true)
  })

  it('caps recommendations from one repository', () => {
    const candidates = [item(1, 1), item(2, 1), item(3, 1), item(4, 1), item(5, 2), item(6, 2)]
    const selected = selectDiverseCandidates(candidates, 6, 3)
    expect(selected.filter((candidate) => candidate.repository.id === 1)).toHaveLength(3)
    expect(selected).toHaveLength(5)
  })
})

