import { OnboardingForm } from '@/components/onboarding-form'
import { StatusMessage } from '@/components/status'
import { requireUser } from '@/lib/auth'
import { ensureProfile } from '@/lib/profile'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const { supabase, user, profile } = await requireUser()

  let initial = profile
  if (!initial) {
    try {
      initial = await ensureProfile(supabase, user)
    } catch {
      initial = null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {params.error === 'profile' && (
        <div className="mx-auto max-w-3xl px-5 pt-8 md:px-10">
          <StatusMessage>Signed in successfully. You can finish this later from Profile.</StatusMessage>
        </div>
      )}
      <OnboardingForm profile={initial} />
    </div>
  )
}
