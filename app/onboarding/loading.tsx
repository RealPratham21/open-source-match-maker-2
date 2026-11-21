import { PageLoading } from '@/components/status'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <PageLoading label="Preparing your profile…" />
    </div>
  )
}
