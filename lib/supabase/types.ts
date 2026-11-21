export type Profile = {
  id: string
  github_username: string | null
  display_name: string | null
  avatar_url: string | null
  experience_level: string | null
  languages: string[]
  technologies: string[]
  interests: string[]
  learning_goals: string[]
  contribution_types: string[]
  preferred_difficulty: string | null
  available_time: string | null
  operating_system: string | null
  ram_gb: number | null
  cpu: string | null
  gpu: string | null
  docker_available: boolean | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'github_username'
    | 'display_name'
    | 'avatar_url'
    | 'experience_level'
    | 'languages'
    | 'technologies'
    | 'interests'
    | 'learning_goals'
    | 'contribution_types'
    | 'preferred_difficulty'
    | 'available_time'
    | 'operating_system'
    | 'ram_gb'
    | 'cpu'
    | 'gpu'
    | 'docker_available'
    | 'onboarding_completed'
  >
>

export type UserIssueStatus = 'saved' | 'dismissed' | 'considering' | 'working' | 'completed'
