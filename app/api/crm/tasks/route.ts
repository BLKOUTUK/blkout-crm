import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Server-side access to the tasks table via the service-role key.
// Same rationale as the activities route — keeps the table locked under RLS.
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
  const status = searchParams.get('status')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 1000)

  let query = sb
    .from('tasks')
    .select(SELECT_WITH_JOINS)
    .order('due_date', { ascending: true })
    .limit(limit)

  if (contactId) query = query.eq('contact_id', contactId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
