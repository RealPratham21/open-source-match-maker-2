export function StatusMessage({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-border bg-muted/60 px-3.5 py-3 text-sm leading-6 text-muted-foreground">
      {children}
    </p>
  )
}

export function PageLoading({ label }: { label: string }) {
  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-5">
      <p className="text-sm text-muted-foreground">{label}</p>
    </main>
  )
}
