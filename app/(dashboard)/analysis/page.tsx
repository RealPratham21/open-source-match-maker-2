import { AnalysisView } from '@/components/analysis-view'
import { requireOnboardedUser } from '@/lib/auth'
import { getRecommendation } from '@/lib/persistence/recommendations'

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams
  const id = params.id ? Number(params.id) : undefined
  const issueId = Number.isFinite(id) ? id : undefined
  const { supabase, user } = await requireOnboardedUser()
  const recommendation = issueId ? await getRecommendation(supabase, user.id, issueId) : null
  return <AnalysisView issueId={issueId} initialRecommendation={recommendation} />
}
