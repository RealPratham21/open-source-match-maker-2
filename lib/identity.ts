import type { User } from '@supabase/supabase-js'

export type GitHubIdentity = {
  username: string | null
  displayName: string
  avatarUrl: string | null
}

export function identityFromUser(user: User | null | undefined): GitHubIdentity {
  const meta = user?.user_metadata ?? {}
  const username =
    asOptionalString(meta.user_name) ??
    asOptionalString(meta.preferred_username) ??
    asOptionalString(meta.login)

  const displayName =
    asOptionalString(meta.full_name) ?? asOptionalString(meta.name) ?? username ?? 'Developer'

  const avatarUrl = asOptionalString(meta.avatar_url) ?? asOptionalString(meta.picture)

  return { username, displayName, avatarUrl }
}

export function firstName(displayName: string) {
  const part = displayName.trim().split(/\s+/)[0]
  return part || 'there'
}

export function initials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase()
}

function asOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
