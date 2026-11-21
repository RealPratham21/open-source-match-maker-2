'use client'

import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { initials } from '@/lib/identity'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'

export function ProfileView({
  profile,
  displayName,
  username,
  avatarUrl,
}: {
  profile: Profile
  displayName: string
  username: string | null
  avatarUrl: string | null
}) {
  const letter = initials(displayName)
  const experience = profile.experience_level || 'Developer'
  const machine = {
    os: profile.operating_system || '—',
    ram: profile.ram_gb ? `${profile.ram_gb} GB` : '—',
    cpu: profile.cpu || '—',
    gpu: profile.gpu || '—',
    docker: profile.docker_available ? 'Available' : 'Not available',
  }

  const sections: [string, string[]][] = [
    ['Skills', [...profile.languages, ...profile.technologies]],
    ['Interests', profile.interests],
    ['Learning goals', profile.learning_goals],
    ['Contribution preferences', profile.contribution_types],
  ]

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:px-10">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="size-16 rounded-full bg-secondary object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-xl font-semibold">{letter}</div>
        )}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {username ? `@${username}` : 'GitHub user'} · {experience} developer
          </p>
        </div>
        <Link href="/onboarding" className={cn(buttonVariants({ variant: 'outline' }), 'ml-auto')}>
          <Settings2 data-icon="inline-start" /> Edit profile
        </Link>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {sections.map(([title, items]) => (
          <section key={title} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{title}</h2>
              <Link href="/onboarding" className="text-xs text-primary">
                Edit
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {items.length ? (
                items.map((x) => (
                  <span key={x} className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                    {x}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Not set yet</span>
              )}
            </div>
          </section>
        ))}
        <section className="rounded-xl border border-border bg-card p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Machine configuration</h2>
            <Link href="/onboarding" className="text-xs text-primary">
              Edit
            </Link>
          </div>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-5">
            {Object.entries(machine).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs capitalize text-muted-foreground">{key}</p>
                <p className="mt-1">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
