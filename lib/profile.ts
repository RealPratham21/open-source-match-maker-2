import type { SupabaseClient, User } from '@supabase/supabase-js'
import { identityFromUser } from './identity'
import type { Profile, ProfileUpdate } from './supabase/types'

export function emptyProfile(userId: string, identity: ReturnType<typeof identityFromUser>): Profile {
  return {
    id: userId,
    github_username: identity.username,
    display_name: identity.displayName,
    avatar_url: identity.avatarUrl,
    experience_level: null,
    languages: [],
    technologies: [],
    interests: [],
    learning_goals: [],
    contribution_types: [],
    preferred_difficulty: null,
    available_time: null,
    operating_system: null,
    ram_gb: null,
    cpu: null,
    gpu: null,
    docker_available: null,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const identity = identityFromUser(user)
  const existing = await getProfile(supabase, user.id)

  if (!existing) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        github_username: identity.username,
        display_name: identity.displayName,
        avatar_url: identity.avatarUrl,
      })
      .select('*')
      .single()

    if (error) {
      const raced = await getProfile(supabase, user.id)
      if (raced) return raced
      throw error
    }
    return data as Profile
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      github_username: identity.username ?? existing.github_username,
      display_name: identity.displayName || existing.display_name,
      avatar_url: identity.avatarUrl ?? existing.avatar_url,
    })
    .eq('id', user.id)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function saveOnboarding(supabase: SupabaseClient, userId: string, values: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...values, onboarding_completed: true })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}
