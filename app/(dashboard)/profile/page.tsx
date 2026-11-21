import { ProfileView } from '@/components/profile-view'
import { displayIdentity, requireUser } from '@/lib/auth'
import { identityFromUser } from '@/lib/identity'
import { emptyProfile } from '@/lib/profile'

export default async function ProfilePage() {
  const { user, profile } = await requireUser()
  const identity = displayIdentity(profile, user)
  return (
    <ProfileView
      profile={profile ?? emptyProfile(user.id, identityFromUser(user))}
      displayName={identity.displayName}
      username={identity.username}
      avatarUrl={identity.avatarUrl}
    />
  )
}
