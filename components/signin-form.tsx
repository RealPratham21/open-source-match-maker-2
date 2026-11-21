'use client'

import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusMessage } from '@/components/status'
import { useSupabase } from '@/components/supabase-provider'

const ERRORS: Record<string, string> = {
  oauth: 'GitHub authorization was cancelled or failed. Please try again.',
  missing_code: 'GitHub did not return an authorization code. Please try signing in again.',
  session: 'We could not create your session. Please try again in a moment.',
  profile: 'Signed in, but we could not load your profile. Continue from onboarding if this persists.',
  supabase: 'We could not reach the authentication service. Check your connection and try again.',
}

export function SignInForm({ errorCode }: { errorCode?: string }) {
  const supabase = useSupabase()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(errorCode ? ERRORS[errorCode] ?? 'Something went wrong while signing in.' : '')

  async function signIn() {
    setPending(true)
    setError('')
    try {
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${origin}/auth/callback`,
          scopes: 'read:user user:email',
        },
      })
      if (oauthError) {
        setError(ERRORS.oauth)
        setPending(false)
      }
    } catch {
      setError(ERRORS.supabase)
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <GitBranch className="size-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Bring your GitHub context.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in to create a profile and discover issues that fit your experience.
        </p>
        {error && (
          <div className="mt-6 text-left">
            <StatusMessage>{error}</StatusMessage>
          </div>
        )}
        <Button className="mt-8 w-full" size="lg" onClick={signIn} disabled={pending}>
          <GitBranch data-icon="inline-start" />
          {pending ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">We only use your GitHub profile to personalise recommendations.</p>
      </div>
    </main>
  )
}
