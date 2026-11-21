'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Laptop } from 'lucide-react'
import { recommendations } from '@/lib/mock-data'
import { Button, buttonVariants } from '@/components/ui/button'
import { RecommendationCard } from '@/components/recommendation-card'
import { cn } from '@/lib/utils'

export function LandingPage() {
  const router = useRouter()
  return (
    <main>
      <section className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-16 pt-20 text-center md:px-10 md:pt-28">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" /> Built for meaningful contributions
        </div>
        <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.04em] text-foreground md:text-7xl">
          Find open-source issues you can actually solve.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
          We understand your skills, what you want to learn, and what your machine can realistically run. Then we surface the
          open-source work that fits.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signin" className={cn(buttonVariants({ size: 'lg' }))}>
            Find my issues <ChevronRight data-icon="inline-end" />
          </Link>
          <Button size="lg" variant="outline" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore how it works
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 md:px-10">
        <div className="grid gap-4 rounded-2xl border border-border bg-muted/40 p-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <RecommendationCard rec={recommendations[0]} onAnalysis={() => router.push('/signin')} saved={false} onSave={() => {}} />
          </div>
          <div className="hidden flex-col justify-between rounded-xl border border-border bg-card p-6 md:flex">
            <div>
              <div className="mb-8 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Laptop className="size-5" />
              </div>
              <p className="text-sm font-medium">Matched to your setup</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No GPU? No problem. Every recommendation considers the environment you actually have.
              </p>
            </div>
            <div className="border-t border-border pt-4 text-xs text-muted-foreground">3 signals checked per issue</div>
          </div>
        </div>
      </section>
      <section id="how" className="mx-auto max-w-6xl px-5 py-24 md:px-10">
        <p className="mb-3 text-sm font-medium text-primary">A better way in</p>
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">Start contributing with context, not guesswork.</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            ['01', 'Tell us about yourself', 'Skills, interests, experience and machine.'],
            ['02', 'We analyse open source', 'Active repos, issue complexity, setup requirements, competition and project health.'],
            ['03', 'Get ranked opportunities', 'Issues matched to what you can realistically contribute to.'],
          ].map(([num, title, copy]) => (
            <div key={num} className="border-t border-border pt-5">
              <span className="font-mono text-xs text-muted-foreground">{num}</span>
              <h3 className="mt-8 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
