import { NextResponse } from 'next/server'
import { ensureProfile } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'

function redirectUrl(request: Request, path: string) {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin
  return `${base}${path}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthDescription = searchParams.get('error_description')

  if (oauthError) {
    const message = oauthDescription ? 'oauth' : 'oauth'
    return NextResponse.redirect(redirectUrl(request, `/signin?error=${message}`))
  }

  if (!code) {
    return NextResponse.redirect(redirectUrl(request, '/signin?error=missing_code'))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(redirectUrl(request, '/signin?error=session'))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(redirectUrl(request, '/signin?error=session'))
  }

  try {
    const profile = await ensureProfile(supabase, user)
    return NextResponse.redirect(redirectUrl(request, profile.onboarding_completed ? '/discover' : '/onboarding'))
  } catch {
    return NextResponse.redirect(redirectUrl(request, '/onboarding?error=profile'))
  }
}
