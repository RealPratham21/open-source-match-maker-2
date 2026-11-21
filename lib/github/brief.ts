import type { BriefStep, IssueBrief } from '@/lib/mock-data'
import type { CandidateIssue, DiscoveryProfile } from './types'

const MAX_SUMMARY = 460
const MAX_ITEMS = 7
const MAX_ITEM_LENGTH = 260

export function buildHeuristicBrief(candidate: CandidateIssue, profile?: DiscoveryProfile): IssueBrief {
  const files = candidate.environment.setupFilesFound.map((file) => file.toLowerCase())
  const labels = candidate.issue.labels.map((label) => label.toLowerCase())
  const technologies = candidate.environment.technologies.map((item) => item.toLowerCase())
  const languages = candidate.environment.languages.map((item) => item.toLowerCase())
  const body = stripMarkdown(candidate.issue.body ?? '')
  const tracker = /(?:wave|meta|roadmap|tracking)\s+(?:issue|tracker)|not an implementation specification/i.test(`${candidate.issue.title} ${body}`)
  const summary = body
    ? clip(`${candidate.issue.title.replace(/\s+/g, ' ').trim()}. ${body}`, MAX_SUMMARY)
    : `The issue titled “${candidate.issue.title}” does not include a detailed description on GitHub.`
  const setup = limit([
    `Clone ${candidate.repository.fullName} and create a branch for issue #${candidate.issue.number}.`,
    files.some((file) => file.includes('readme')) ? 'Follow the exact install and local-run steps in the repository README.' : null,
    files.some((file) => file.includes('contributing')) ? 'Read CONTRIBUTING.md before making the change.' : null,
    files.some((file) => file.includes('pyproject') || file.includes('requirements') || file.includes('pipfile'))
      ? 'Create a Python virtual environment and install dependencies from the detected project file.'
      : null,
    files.some((file) => file.includes('package.json')) ? 'Install Node dependencies with the lockfile package manager used by the repository.' : null,
    candidate.environment.docker ? 'Use the repository container workflow only if its README identifies it as the supported setup.' : null,
  ])
  const approach = limit([
    tracker ? 'Choose one linked implementation task; this tracker is not itself a scoped code change.' : null,
    labels.some((label) => label.includes('bug') || label.includes('fix'))
      ? 'Reproduce the reported behaviour and capture it in a failing regression test.'
      : 'Translate the issue’s requested outcome into one small, verifiable change.',
    labels.some((label) => label.includes('doc'))
      ? 'Keep the change in documentation or examples unless the issue explicitly requests code.'
      : 'Trace the affected component, follow its existing pattern, and avoid unrelated refactors.',
    candidate.issue.comments > 0 ? 'Read the issue discussion for maintainer constraints or an already-preferred approach.' : null,
  ])
  const validate = limit([
    technologies.includes('pytest') || languages.includes('python') ? 'Run the focused Python test and then the relevant pytest suite.' : null,
    technologies.includes('node.js') || files.some((file) => file.includes('package.json'))
      ? 'Run the repository’s documented test, lint, and type-check scripts.'
      : null,
    'Verify the result against the acceptance criteria in the issue.',
  ])
  const gaps = limit([
    tracker ? 'This appears to be a tracker or planning issue, so it may not be directly implementable.' : null,
    body.length < 80 ? 'The issue body is thin; ask the maintainer to confirm scope before implementing.' : null,
    files.some((file) => file.includes('readme') || file.includes('contributing')) ? null : 'No README or contributing guide was detected, so setup instructions are incomplete.',
  ])

  return {
    version: 2,
    source: 'heuristic',
    summary,
    objective: tracker ? 'Select and complete one of the concrete implementation tasks linked by this tracker.' : clip(candidate.issue.title, 180),
    issueType: tracker ? 'Planning / tracker' : inferIssueType(labels),
    actionable: !tracker && body.length >= 40,
    actionabilityReason: tracker
      ? 'The issue describes a program of work rather than a single implementation change.'
      : body.length >= 40
        ? 'The issue contains enough detail to begin investigation, subject to maintainer guidance.'
        : 'The issue description needs clarification before implementation.',
    personalizedFit: profile ? buildProfileFit(candidate, profile) : [],
    prerequisites: limit([
      ...candidate.environment.languages.map((language) => `Working knowledge of ${language}`),
      ...candidate.environment.infrastructure.map((item) => `A local ${item} service or the repository’s documented substitute`),
      candidate.environment.docker ? 'Docker, if the documented setup uses it' : null,
    ]),
    setup,
    setupCommands: [],
    approach,
    approachSteps: approach.map((details, index) => ({ title: stepTitle(details, index), details })),
    validate,
    validationCommands: [],
    risks: gaps,
    gaps,
    evidenceUsed: limit([
      `Issue #${candidate.issue.number} title, description, labels, and activity`,
      candidate.environment.setupFilesFound.length ? `Detected setup files: ${candidate.environment.setupFilesFound.join(', ')}` : null,
      profile ? 'Your saved contributor profile' : null,
    ]),
  }
}

export function parseIssueBrief(raw: unknown, fallback: IssueBrief, source: IssueBrief['source'] = 'cohere'): IssueBrief | null {
  const value = typeof raw === 'string' ? parseJsonObject(raw) : raw
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const summary = cleanText(record.summary)
  const objective = cleanText(record.objective)
  const issueType = cleanText(record.issueType)
  const actionabilityReason = cleanText(record.actionabilityReason)
  if (!summary || !objective || !issueType || typeof record.actionable !== 'boolean' || !actionabilityReason) return null

  const setup = cleanList(record.setup, fallback.setup)
  const approachSteps = cleanSteps(record.approachSteps)
  const approach = approachSteps.length ? approachSteps.map((step) => step.details) : cleanList(record.approach, fallback.approach)
  const validate = cleanList(record.validate, fallback.validate)
  const gaps = cleanList(record.gaps, fallback.gaps)

  return {
    version: 2,
    source,
    summary: clip(summary, MAX_SUMMARY),
    objective: clip(objective, MAX_ITEM_LENGTH),
    issueType: clip(issueType, 80),
    actionable: record.actionable,
    actionabilityReason: clip(actionabilityReason, MAX_ITEM_LENGTH),
    personalizedFit: cleanList(record.personalizedFit, fallback.personalizedFit ?? []),
    prerequisites: cleanList(record.prerequisites, fallback.prerequisites ?? []),
    setup,
    setupCommands: cleanCommands(record.setupCommands),
    approach,
    approachSteps: approachSteps.length ? approachSteps : approach.map((details, index) => ({ title: stepTitle(details, index), details })),
    validate,
    validationCommands: cleanCommands(record.validationCommands),
    risks: cleanList(record.risks, fallback.risks ?? fallback.gaps),
    gaps,
    evidenceUsed: cleanList(record.evidenceUsed, fallback.evidenceUsed ?? []),
  }
}

function parseJsonObject(raw: string) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(trimmed) as unknown } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    try { return JSON.parse(trimmed.slice(start, end + 1)) as unknown } catch { return null }
  }
}

function cleanSteps(value: unknown): BriefStep[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const title = cleanText((item as Record<string, unknown>).title)
    const details = cleanText((item as Record<string, unknown>).details)
    return title && details ? { title: clip(title, 80), details: clip(details, MAX_ITEM_LENGTH) } : null
  }).filter((item): item is BriefStep => Boolean(item)).slice(0, MAX_ITEMS)
}

function cleanCommands(value: unknown) { return cleanList(value, []).filter((command) => !/[\r\n]/.test(command)) }
function cleanList(value: unknown, fallback: string[]) {
  const items = Array.isArray(value) ? value.map((item) => cleanText(item)).filter(Boolean) : []
  return limit(items.length ? items : fallback)
}
function cleanText(value: unknown) { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '' }
function limit(items: Array<string | null>) { return unique(items.filter((item): item is string => Boolean(item)).map((item) => clip(item, MAX_ITEM_LENGTH))).slice(0, MAX_ITEMS) }
function unique(items: string[]) {
  const seen = new Set<string>()
  return items.filter((item) => { const key = item.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true })
}
function clip(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…` }
function inferIssueType(labels: string[]) {
  if (labels.some((label) => label.includes('bug') || label.includes('fix'))) return 'Bug fix'
  if (labels.some((label) => label.includes('doc'))) return 'Documentation'
  if (labels.some((label) => label.includes('test'))) return 'Testing'
  if (labels.some((label) => label.includes('feature') || label.includes('enhancement'))) return 'Feature / enhancement'
  return 'Code contribution'
}
function buildProfileFit(candidate: CandidateIssue, profile: DiscoveryProfile) {
  const stack = [...candidate.environment.languages, ...candidate.environment.technologies]
  const known = stack.filter((item) => [...profile.languages, ...profile.technologies].some((skill) => skill.toLowerCase() === item.toLowerCase()))
  const learning = stack.filter((item) => profile.learning_goals.some((goal) => goal.toLowerCase() === item.toLowerCase()))
  return limit([
    known.length ? `You already list ${known.join(', ')} in your profile.` : 'This issue introduces repository-specific skills beyond your saved stack.',
    learning.length ? `It directly supports your goal to learn ${learning.join(', ')}.` : null,
    profile.available_time ? `Compare the implementation estimate with your ${profile.available_time} availability before claiming it.` : null,
    candidate.environment.docker && profile.docker_available ? 'The repository uses Docker and your profile says Docker is available.' : null,
  ])
}
function stepTitle(details: string, index: number) {
  if (/reproduce|failing test/i.test(details)) return 'Reproduce the problem'
  if (/read|trace|confirm|translate/i.test(details)) return 'Understand the scope'
  if (/implement|change|refactor|update/i.test(details)) return 'Make the change'
  if (/tracker|linked/i.test(details)) return 'Choose a concrete task'
  return `Step ${index + 1}`
}

export function stripMarkdown(value: string) {
  return value.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]+)`/g, '$1').replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^>\s+/gm, '').replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~]+/g, ' ').replace(/\s+/g, ' ').trim()
}
