import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie))
  return to
}

function redirectWithCookies(request: NextRequest, supabaseResponse: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return copyCookies(supabaseResponse, NextResponse.redirect(url))
}

const protectedPrefixes = ['/discover', '/saved', '/profile', '/analysis', '/onboarding']

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  let supabase
  try {
    supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    })
  } catch {
    if (isProtected(pathname)) {
      return redirectWithCookies(request, supabaseResponse, '/signin')
    }
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isProtected(pathname)) {
      return redirectWithCookies(request, supabaseResponse, '/signin')
    }
    return supabaseResponse
  }

  if (pathname === '/signin') {
    return redirectWithCookies(request, supabaseResponse, '/discover')
  }

  return supabaseResponse
}
