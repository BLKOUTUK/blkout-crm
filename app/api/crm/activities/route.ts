import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Server-side access to the activities table via the service-role key.
// Keeps the table locked under RLS — the public anon key can no longer
// read or write it. Gated to the single CRM user by the basic-auth middleware.
export const dynamic = 'force-dynamic'

const SELECT_WITH_JOINS = `
  *,
  contact:contacts(id, first_name, last_name),
  organization:organizations(id, name)
`

export async function GET(request: NextRequest) {
  const sb = createAdminClient()
  const { searchParams } = new URL(request.url)
  const contactId = searchParams.get('contactId')
  const activityType = searchParams.get('activityType')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 15000)

  let query = sb
    .from('activities')
    .select(SELECT_WITH_JOINS)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (contactId) query = query.eq('contact_id', contactId)
  if (activityType) query = query.eq('activity_type', activityType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const sb = createAdminClient()
  const body = await request.json()
  const { contact_id, activity_type, subject, description, metadata } = body

  const { data, error } = await sb
    .from('activities')
    .insert({ contact_id, activity_type, subject, description, metadata })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (contact_id) {
    await sb.rpc('increment_ivor_interactions', { p_contact_id: contact_id })
  }

  return NextResponse.json(data)
}
