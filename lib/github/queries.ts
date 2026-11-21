import { MAX_SEARCH_QUERIES, REPO_ACTIVITY_MONTHS } from './constants'
import type { DiscoveryProfile } from './types'

const INTEREST_TERMS: Record<string, string> = {
  backend: 'backend',
  frontend: 'frontend',
  'ai / ml': 'machine-learning',
  'developer tools': 'developer-tools',
  infrastructure: 'infrastructure',
  databases: 'database',
  web: 'web',
  security: 'security',
}

const TECH_TOPICS: Record<string, string> = {
  react: 'react',
  'next.js': 'nextjs',
  fastapi: 'fastapi',
  postgresql: 'postgresql',
  docker: 'docker',
  'machine learning': 'machine-learning',
  'node.js': 'nodejs',
  pytest: 'testing',
}

const LANGUAGE_GOALS = new Set(['python', 'typescript', 'javascript', 'go', 'rust', 'java', 'c++', 'c#'])

function pushedSince() {
  const date = new Date()
  date.setMonth(date.getMonth() - REPO_ACTIVITY_MONTHS)
  return date.toISOString().slice(0, 10)
}

function slug(value: string) {
  return value.trim().toLowerCase()
}

function githubLanguage(value: string) {
  if (slug(value) === 'c++') return 'C++'
  if (slug(value) === 'c#') return 'C#'
  return value.trim()
}

function interestTerm(value: string) {
  return INTEREST_TERMS[slug(value)] ?? value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

function techTopic(value: string) {
  return TECH_TOPICS[slug(value)] ?? slug(value).replace(/[^a-z0-9]+/g, '-')
}

export function generateRepositoryQueries(profile: DiscoveryProfile) {
  const pushed = pushedSince()
  const base = `is:public archived:false fork:false pushed:>=${pushed}`
  const queries: string[] = []
  const languages = profile.languages.slice(0, 2)
  const interests = profile.interests.slice(0, 2)
  const technologies = profile.technologies.slice(0, 2)
  const learning = profile.learning_goals[0]

  for (const language of languages) {
    // Always retain a broad language query. Interest terms improve precision, but
    // using them exclusively can leave otherwise suitable repositories invisible.
    queries.push(`language:${githubLanguage(language)} ${base}`)
    for (const interest of interests) {
      queries.push(`language:${githubLanguage(language)} ${interestTerm(interest)} ${base}`)
    }
  }

  for (const tech of technologies.slice(0, 1)) {
    queries.push(`topic:${techTopic(tech)} ${base}`)
  }

  if (learning) {
    if (LANGUAGE_GOALS.has(slug(learning))) {
      queries.push(`language:${githubLanguage(learning)} ${base}`)
    } else {
      queries.push(`${interestTerm(learning)} ${base}`)
    }
  }

  const unique = [...new Set(queries.filter(Boolean))]
  return unique.slice(0, MAX_SEARCH_QUERIES)
}
