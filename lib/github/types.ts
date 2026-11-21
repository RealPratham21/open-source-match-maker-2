export type ClaimStatus = 'available' | 'possibly_claimed' | 'assigned' | 'unknown'

export type DiscoveryProfile = {
  languages: string[]
  technologies: string[]
  interests: string[]
  learning_goals: string[]
  contribution_types: string[]
  preferred_difficulty: string | null
  available_time: string | null
  operating_system: string | null
  ram_gb: number | null
  gpu: string | null
  docker_available: boolean | null
  onboarding_completed: boolean
}

export type DiscoveredRepository = {
  githubId: number
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  stars: number
  forks: number
  primaryLanguage: string | null
  topics: string[]
  lastPushedAt: string
  archived: boolean
  disabled: boolean
  hasIssues: boolean
  openIssues: number
  healthScore: number
  relevanceScore: number
}

export type DiscoveredIssue = {
  githubId: number
  number: number
  title: string
  body: string | null
  url: string
  labels: string[]
  comments: number
  createdAt: string
  updatedAt: string
  assignees: string[]
  author: string | null
  isPullRequest: boolean
}

export type EnvironmentSignals = {
  languages: string[]
  technologies: string[]
  docker: boolean
  gpuLikelyRequired: boolean
  infrastructure: string[]
  setupFilesFound: string[]
}

export type CandidateIssue = {
  repository: {
    id: number
    owner: string
    name: string
    fullName: string
    description: string | null
    url: string
    stars: number
    primaryLanguage: string | null
    topics: string[]
    lastPushedAt: string
    healthScore: number
  }
  issue: {
    id: number
    number: number
    title: string
    body: string | null
    url: string
    labels: string[]
    comments: number
    createdAt: string
    updatedAt: string
    assignees: string[]
    author: string | null
  }
  preliminary: {
    profileRelevance: number
    repoHealth: number
    machineCompatibility: number
    claimStatus: ClaimStatus
  }
  environment: EnvironmentSignals
}

export class DiscoveryError extends Error {
  constructor(
    public code:
      | 'unauthorized'
      | 'incomplete_profile'
      | 'missing_token'
      | 'rate_limit'
      | 'github'
      | 'no_repositories'
      | 'no_issues',
    message: string,
  ) {
    super(message)
    this.name = 'DiscoveryError'
  }
}
