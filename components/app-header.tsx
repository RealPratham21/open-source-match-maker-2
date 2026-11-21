'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { useSupabase } from '@/components/supabase-provider'
import { initials } from '@/lib/identity'

const navItems = [
  { href: '/discover', label: 'Discover' },
  { href: '/saved', label: 'Saved' },
  { href: '/profile', label: 'Profile' },
] as const

export function AppHeader({
  displayName,
  avatarUrl,
}: {
  displayName: string
  avatarUrl: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const letter = initials(displayName)

  async function signOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between px-5 py-4 md:px-10">
        <Link href="/discover" aria-label="Go to discover">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-4 py-2 text-sm ${
                pathname === item.href ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              className="flex items-center gap-2 text-sm text-muted-foreground"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
            >
              <Avatar displayName={displayName} avatarUrl={avatarUrl} letter={letter} />
              {displayName}
            </button>
            {accountOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-border bg-card p-1 shadow-md">
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="size-4" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
          <button
            className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-border px-5 py-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-md px-3 py-2 text-sm ${
                pathname === item.href ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground"
          >
            <LogOut className="size-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </header>
  )
}

function Avatar({
  displayName,
  avatarUrl,
  letter,
}: {
  displayName: string
  avatarUrl: string | null
  letter: string
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="size-7 rounded-full bg-secondary object-cover"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-medium text-foreground">
      {letter}
    </span>
  )
}
