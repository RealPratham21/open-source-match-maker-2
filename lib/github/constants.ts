export const REPO_ACTIVITY_MONTHS = 6
export const ISSUE_STALE_MONTHS = 4

export const REPO_CACHE_HOURS = 6
export const ISSUE_CACHE_HOURS = 2
export const ANALYSIS_CACHE_HOURS = 24

export const MAX_SEARCH_QUERIES = 6
export const MAX_REPOS_PER_QUERY = 15
export const SHORTLIST_REPOS = 20
export const ISSUES_PER_REPO = 25
export const MAX_ENRICH_ISSUES = 30
export const MAX_COMMENT_CHECKS = 18
export const COMMENTS_PER_ISSUE = 8
export const MAX_CANDIDATES = 12
export const MAX_CANDIDATES_PER_REPOSITORY = 3
export const MIN_ISSUE_BODY_LENGTH = 40

export const SETUP_FILES = [
  'README.md',
  'readme.md',
  'CONTRIBUTING.md',
  'contributing.md',
  'package.json',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
  'Makefile',
] as const

export const PREFERRED_LABELS = ['good first issue', 'help wanted', 'bug', 'enhancement', 'documentation', 'tests', 'testing']

export const REJECT_LABELS = ['invalid', 'duplicate', 'wontfix', "won't fix", 'spam', 'stale']

export const CLAIM_COMMENT_PATTERNS = [
  /i'?d like to work/i,
  /i would like to work/i,
  /can i take this/i,
  /i'?m working on this/i,
  /assign this to me/i,
  /please assign/i,
  /i'?ll take this/i,
  /taking this (issue|one)/i,
]

export const MAINTAINER_CLAIM_PATTERNS = [
  /assigned (this )?to you/i,
  /you('re| are) assigned/i,
  /go ahead/i,
  /all yours/i,
  /it'?s yours/i,
]
