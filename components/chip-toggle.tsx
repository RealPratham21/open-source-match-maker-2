'use client'

import { Check } from 'lucide-react'

export function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-lg border px-3.5 py-2.5 text-sm transition ${
        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/30'
      }`}
    >
      {selected && <Check className="mr-1.5 inline size-3.5" />}
      {label}
    </button>
  )
}
