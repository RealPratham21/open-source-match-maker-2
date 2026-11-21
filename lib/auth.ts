import { redirect } from 'next/navigation'
import { identityFromUser } from './identity'
import { getProfile } from './profile'
import { createClient } from './supabase/server'
import type { Profile } from './supabase/types'

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { supabase, user: null, profile: null as Profile | null, profileError: null as string | null }
  }

  try {
    const profile = await getProfile(supabase, user.id)
    return { supabase, user, profile, profileError: null }
  } catch {
    return { supabase, user, profile: null as Profile | null, profileError: 'profile' }
  }
}

export async function requireUser() {
  const session = await getSessionUser()
  if (!session.user) redirect('/signin')
  return { supabase: session.supabase, user: session.user, profile: session.profile, profileError: session.profileError }
}

export async function requireOnboardedUser() {
  const session = await requireUser()
  if (!session.profile?.onboarding_completed) redirect('/onboarding')
  return session
}

export function displayIdentity(profile: Profile | null, user: Parameters<typeof identityFromUser>[0]) {
  const fromAuth = identityFromUser(user)
  return {
    displayName: profile?.display_name || fromAuth.displayName,
    username: profile?.github_username || fromAuth.username,
    avatarUrl: profile?.avatar_url || fromAuth.avatarUrl,
  }
}
