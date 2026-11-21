import { DiscoverDashboard } from '@/components/discover-dashboard'
import { displayIdentity, requireUser } from '@/lib/auth'

export default async function DiscoverPage() {
  const { user, profile } = await requireUser()
  const identity = displayIdentity(profile, user)
  return <DiscoverDashboard displayName={identity.displayName} />
}
