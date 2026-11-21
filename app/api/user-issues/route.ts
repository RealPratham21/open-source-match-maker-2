import { NextResponse } from 'next/server'
import type { Recommendation } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'
import type { UserIssueStatus } from '@/lib/supabase/types'

const STATUSES = new Set<UserIssueStatus>(['saved', 'dismissed', 'considering', 'working', 'completed'])

async function authenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await authenticatedClient()
  if (!user) return NextResponse.json({ error: 'Sign in to view saved issues.' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_issue_states')
    .select('recommendation')
    .eq('user_id', user.id)
    .eq('status', 'saved')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load saved issues.' }, { status: 500 })

  return NextResponse.json({ recommendations: (data ?? []).map((row) => row.recommendation as Recommendation) })
}

export async function PUT(request: Request) {
  const { supabase, user } = await authenticatedClient()
  if (!user) return NextResponse.json({ error: 'Sign in to save issues.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { recommendation?: Recommendation; status?: UserIssueStatus } | null
  const recommendation = body?.recommendation
  const status = body?.status
  if (!recommendation || !Number.isFinite(recommendation.id) || !status || !STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid issue state.' }, { status: 400 })
  }

  const { error } = await supabase.from('user_issue_states').upsert(
    {
      user_id: user.id,
      github_issue_id: recommendation.id,
      status,
      recommendation,
    },
    { onConflict: 'user_id,github_issue_id' },
  )
  if (error) return NextResponse.json({ error: 'Could not save issue.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { supabase, user } = await authenticatedClient()
  if (!user) return NextResponse.json({ error: 'Sign in to update saved issues.' }, { status: 401 })

  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid issue ID.' }, { status: 400 })

  const { error } = await supabase.from('user_issue_states').delete().eq('user_id', user.id).eq('github_issue_id', id)
  if (error) return NextResponse.json({ error: 'Could not remove saved issue.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

