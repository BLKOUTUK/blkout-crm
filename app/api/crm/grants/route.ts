import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Server-side access to the grant_pipeline table via the service-role key.
// Same rationale as the activities/tasks routes — the table has RLS enabled with
// no policies, so the anon key reads zero rows and writes silently do nothing.
export const dynamic = 'force-dynamic'

const SELECT_WITH_JOINS = `
  *,
  funder:organizations(id, name, org_type)
`

export async function GET(request: NextRequest) {
  const sb = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const stage = searchParams.get('stage')
  const funderId = searchParams.get('funderId')
  const minAmount = searchParams.get('minAmount')
  const maxAmount = searchParams.get('maxAmount')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 1000)

  if (id) {
    const { data, error } = await sb
      .from('grant_pipeline')
      .select(SELECT_WITH_JOINS)
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  let query = sb
    .from('grant_pipeline')
    .select(SELECT_WITH_JOINS)
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (stage) query = query.eq('stage', stage)
  if (funderId) query = query.eq('funder_id', funderId)
  if (minAmount) query = query.gte('amount_requested', Number(minAmount))
  if (maxAmount) query = query.lte('amount_requested', Number(maxAmount))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const sb = createAdminClient()
  const body = await request.json()

  const { data, error } = await sb
    .from('grant_pipeline')
    .insert(body)
    .select(SELECT_WITH_JOINS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const sb = createAdminClient()
  const { id, ...updates } = await request.json()

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // stage_entered_at should move whenever the stage does, so "how long has this
  // been sitting here" stays answerable.
  if (updates.stage) updates.stage_entered_at = new Date().toISOString()
  updates.updated_at = new Date().toISOString()

  const { data, error } = await sb
    .from('grant_pipeline')
    .update(updates)
    .eq('id', id)
    .select(SELECT_WITH_JOINS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const sb = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await sb.from('grant_pipeline').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
