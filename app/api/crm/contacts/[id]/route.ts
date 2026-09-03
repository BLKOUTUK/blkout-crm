import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Server-side read of one contact via the service-role key, so the browser
// never needs an anon SELECT policy on contacts (dropped 3 Sep 2026 — it had
// exposed every row to unauthenticated reads). Same pattern as activities/tasks.
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('contacts')
    .select('*, organization:organizations(*)')
    .eq('id', params.id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(data)
}
