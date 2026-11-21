'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChipToggle } from '@/components/chip-toggle'
import { StatusMessage } from '@/components/status'
import { useSupabase } from '@/components/supabase-provider'
import { saveOnboarding } from '@/lib/profile'
import type { Profile } from '@/lib/supabase/types'
import {
  AVAILABLE_TIMES,
  CONTRIBUTION_TYPES,
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  GPU_OPTIONS,
  INTERESTS,
  LANGUAGES,
  LEARNING_GOALS,
  OPERATING_SYSTEMS,
  RAM_OPTIONS,
  TECHNOLOGIES,
} from '@/lib/onboarding-options'

type Draft = {
  languages: string[]
  technologies: string[]
  interests: string[]
  learning_goals: string[]
  contribution_types: string[]
  experience_level: string
  preferred_difficulty: string
  available_time: string
  operating_system: string
  ram_gb: number | null
  cpu: string
  gpu: string
  docker_available: boolean
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function fromProfile(profile: Profile | null): Draft {
  return {
    languages: profile?.languages ?? [],
    technologies: profile?.technologies ?? [],
    interests: profile?.interests ?? [],
    learning_goals: profile?.learning_goals ?? [],
    contribution_types: profile?.contribution_types ?? [],
    experience_level: profile?.experience_level ?? 'Intermediate',
    preferred_difficulty: profile?.preferred_difficulty ?? 'Intermediate',
    available_time: profile?.available_time ?? '2–5 hours',
    operating_system: profile?.operating_system ?? 'Windows 11',
    ram_gb: profile?.ram_gb ?? 16,
    cpu: profile?.cpu ?? '',
    gpu: profile?.gpu ?? 'No dedicated GPU',
    docker_available: profile?.docker_available ?? true,
  }
}

export function OnboardingForm({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const supabase = useSupabase()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>(() => fromProfile(profile))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const titles = [
    'What do you work with?',
    'What do you want to contribute to?',
    'How do you like to contribute?',
    'Tell us about your machine.',
    'Your profile is ready.',
  ]
  const copy = [
    'Choose everything that sounds right. You can edit this later.',
    'Choose everything that sounds right. You can edit this later.',
    'Choose everything that sounds right. You can edit this later.',
    'We use this to avoid recommending repositories that are painful or impossible to run locally.',
    "A clear snapshot of what we'll use to rank your opportunities.",
  ]

  const ramLabel = draft.ram_gb ? `${draft.ram_gb} GB RAM` : 'Not set'

  async function finish() {
    if (draft.languages.length === 0) {
      setError('Select at least one language so we can match you to issues.')
      setStep(1)
      return
    }
    setSaving(true)
    setError('')
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Your session expired. Please sign in again.')
        setSaving(false)
        return
      }
      await saveOnboarding(supabase, user.id, {
        languages: draft.languages,
        technologies: draft.technologies,
        interests: draft.interests,
        learning_goals: draft.learning_goals,
        contribution_types: draft.contribution_types,
        experience_level: draft.experience_level,
        preferred_difficulty: draft.preferred_difficulty,
        available_time: draft.available_time,
        operating_system: draft.operating_system,
        ram_gb: draft.ram_gb,
        cpu: draft.cpu || null,
        gpu: draft.gpu,
        docker_available: draft.docker_available,
      })
      router.push('/discover')
      router.refresh()
    } catch {
      setError('We could not save your profile. Please try again.')
      setSaving(false)
    }
  }

  const skillsSummary = useMemo(
    () => [...draft.languages, ...draft.technologies].join(' · ') || 'None selected yet',
    [draft.languages, draft.technologies],
  )

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 md:px-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Profile setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Let&apos;s find your fit.</h1>
        </div>
        <span className="font-mono text-sm text-muted-foreground">0{step} / 05</span>
      </div>
      <div className="mb-10 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-secondary'}`} />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-xl font-semibold">{titles[step - 1]}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy[step - 1]}</p>

        {error && (
          <div className="mt-6">
            <StatusMessage>{error}</StatusMessage>
          </div>
        )}

        {step === 1 && (
          <div className="mt-7 flex flex-col gap-6">
            <FieldGroup label="Languages">
              {LANGUAGES.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.languages.includes(item)}
                  onToggle={() => setDraft((d) => ({ ...d, languages: toggleValue(d.languages, item) }))}
                />
              ))}
            </FieldGroup>
            <FieldGroup label="Frameworks and tools">
              {TECHNOLOGIES.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.technologies.includes(item)}
                  onToggle={() => setDraft((d) => ({ ...d, technologies: toggleValue(d.technologies, item) }))}
                />
              ))}
            </FieldGroup>
          </div>
        )}

        {step === 2 && (
          <div className="mt-7 flex flex-col gap-6">
            <FieldGroup label="Areas of interest">
              {INTERESTS.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.interests.includes(item)}
                  onToggle={() => setDraft((d) => ({ ...d, interests: toggleValue(d.interests, item) }))}
                />
              ))}
            </FieldGroup>
            <FieldGroup label="What you want to learn">
              {LEARNING_GOALS.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.learning_goals.includes(item)}
                  onToggle={() => setDraft((d) => ({ ...d, learning_goals: toggleValue(d.learning_goals, item) }))}
                />
              ))}
            </FieldGroup>
          </div>
        )}

        {step === 3 && (
          <div className="mt-7 flex flex-col gap-6">
            <FieldGroup label="Contribution types">
              {CONTRIBUTION_TYPES.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.contribution_types.includes(item)}
                  onToggle={() => setDraft((d) => ({ ...d, contribution_types: toggleValue(d.contribution_types, item) }))}
                />
              ))}
            </FieldGroup>
            <FieldGroup label="Experience level">
              {EXPERIENCE_LEVELS.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.experience_level === item}
                  onToggle={() => setDraft((d) => ({ ...d, experience_level: item }))}
                />
              ))}
            </FieldGroup>
            <FieldGroup label="Preferred issue difficulty">
              {DIFFICULTIES.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.preferred_difficulty === item}
                  onToggle={() => setDraft((d) => ({ ...d, preferred_difficulty: item }))}
                />
              ))}
            </FieldGroup>
            <FieldGroup label="Time you can spend">
              {AVAILABLE_TIMES.map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  selected={draft.available_time === item}
                  onToggle={() => setDraft((d) => ({ ...d, available_time: item }))}
                />
              ))}
            </FieldGroup>
          </div>
        )}

        {step === 4 && (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <SelectCard
              label="Operating system"
              value={draft.operating_system}
              options={OPERATING_SYSTEMS}
              onChange={(operating_system) => setDraft((d) => ({ ...d, operating_system }))}
            />
            <SelectCard
              label="Memory"
              value={String(draft.ram_gb ?? 16)}
              options={RAM_OPTIONS.map(String)}
              display={(value) => `${value} GB RAM`}
              onChange={(value) => setDraft((d) => ({ ...d, ram_gb: Number(value) }))}
            />
            <label className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">CPU</p>
              <input
                value={draft.cpu}
                onChange={(event) => setDraft((d) => ({ ...d, cpu: event.target.value }))}
                placeholder="Intel i5"
                className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>
            <SelectCard label="GPU" value={draft.gpu} options={GPU_OPTIONS} onChange={(gpu) => setDraft((d) => ({ ...d, gpu }))} />
            <SelectCard
              label="Container runtime"
              value={draft.docker_available ? 'yes' : 'no'}
              options={['yes', 'no']}
              display={(value) => (value === 'yes' ? 'Docker available' : 'No Docker')}
              onChange={(value) => setDraft((d) => ({ ...d, docker_available: value === 'yes' }))}
            />
          </div>
        )}

        {step === 5 && (
          <div className="mt-7 grid gap-5 text-sm sm:grid-cols-2">
            <Summary label="Skills" value={skillsSummary} />
            <Summary label="Interested in" value={draft.interests.join(' · ') || 'None selected yet'} />
            <Summary label="Learning" value={draft.learning_goals.join(' · ') || 'None selected yet'} />
            <Summary
              label="Environment"
              value={`${draft.operating_system} · ${ramLabel}${draft.docker_available ? ' · Docker' : ''}`}
            />
          </div>
        )}

        <div className="mt-10 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 1 || saving}>
            <ChevronLeft data-icon="inline-start" /> Back
          </Button>
          {step === 5 ? (
            <Button onClick={finish} disabled={saving}>
              {saving ? 'Saving…' : 'Find my matches'} <ChevronRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continue <ChevronRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 leading-7">{value}</p>
    </div>
  )
}

function SelectCard({
  label,
  value,
  options,
  onChange,
  display,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  display?: (value: string) => string
}) {
  return (
    <label className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {display ? display(option) : option}
          </option>
        ))}
      </select>
    </label>
  )
}
