import { Sparkles } from 'lucide-react'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2 font-semibold tracking-tight ${light ? 'text-white' : 'text-foreground'}`}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </span>
      contrib<span className="text-primary">match</span>
    </div>
  )
}
