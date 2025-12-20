import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Types
interface DataExportRequest {
  email: string
  type: 'export' | 'delete'
}

interface ContactData {
  email: string
  firstName?: string
  preferredName?: string
  pronouns?: string
  subscriptions: Record<string, boolean>
  consentGiven: boolean
  consentTimestamp?: string
  signupSource?: string
  createdAt: string
  auditLog: Array<{
    action: string
    timestamp: string
    details?: Record<string, unknown>
  }>
}

// POST /api/community/data-rights
// Handle data export and deletion requests (GDPR Articles 15, 17)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DataExportRequest = await request.json()

    if (!body.email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()

    const supabase = getSupabase()

    // Find contact
    const { data: contact, error: findError } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', email)
      .single()

    if (findError || !contact) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email address' },
        { status: 404 }
      )
    }

    if (body.type === 'export') {
      return handleExportRequest(contact)
    } else if (body.type === 'delete') {
      return handleDeleteRequest(contact)
    }

    return NextResponse.json(
      { success: false, message: 'Invalid request type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Data rights error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Handle GDPR Article 15 - Right of Access
async function handleExportRequest(contact: Record<string, unknown>): Promise<NextResponse> {
  const supabase = getSupabase()

  // Get audit log for this contact
  const { data: auditLog } = await supabase
    .from('consent_audit_log')
    .select('action, created_at, details')
    .eq('contact_id', contact.id)
    .order('created_at', { ascending: false })

  // Get BLKOUTHUB invitations
  const { data: invitations } = await supabase
    .from('blkouthub_invitations')
    .select('sent_at, accepted_at, status')
    .eq('contact_id', contact.id)

  // Compile export data
  const exportData: ContactData = {
    email: contact.email as string,
    firstName: contact.first_name as string | undefined,
    preferredName: contact.preferred_name as string | undefined,
    pronouns: contact.pronouns as string | undefined,
    subscriptions: contact.subscriptions as Record<string, boolean>,
    consentGiven: contact.consent_given as boolean,
    consentTimestamp: contact.consent_timestamp as string | undefined,
    signupSource: contact.signup_source as string | undefined,
    createdAt: contact.created_at as string,
    auditLog: (auditLog || []).map((log) => ({
      action: log.action,
      timestamp: log.created_at,
      details: log.details as Record<string, unknown> | undefined,
    })),
  }

  // Log the export request
  await supabase.from('consent_audit_log').insert({
    contact_id: contact.id,
    action: 'data_exported',
    details: { exportedAt: new Date().toISOString() },
  })

  // Update contact record
  await supabase
    .from('contacts')
    .update({
      data_export_requested_at: new Date().toISOString(),
      data_export_completed_at: new Date().toISOString(),
    })
    .eq('id', contact.id)

  return NextResponse.json({
    success: true,
    message: 'Your data export is ready',
    data: exportData,
    exportedAt: new Date().toISOString(),
  })
}

// Handle GDPR Article 17 - Right to Erasure
async function handleDeleteRequest(contact: Record<string, unknown>): Promise<NextResponse> {
  const supabase = getSupabase()
  const contactId = contact.id as string

  // Log the deletion request before deleting
  await supabase.from('consent_audit_log').insert({
    contact_id: contactId,
    action: 'deletion_requested',
    details: {
      email: contact.email,
      requestedAt: new Date().toISOString(),
    },
  })

  // Schedule deletion (30-day grace period for compliance)
  const deletionDate = new Date()
  deletionDate.setDate(deletionDate.getDate() + 30)

  await supabase
    .from('contacts')
    .update({
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_for: deletionDate.toISOString(),
      // Immediately unsubscribe from everything
      subscriptions: {
        newsletter: false,
        events: false,
        blkouthub: false,
        volunteer: false,
      },
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: 'deletion_request',
    })
    .eq('id', contactId)

  return NextResponse.json({
    success: true,
    message: `Your deletion request has been received. Your data will be permanently deleted on ${deletionDate.toLocaleDateString('en-GB')}. You have been immediately unsubscribed from all communications.`,
    deletionScheduledFor: deletionDate.toISOString(),
  })
}

// GET /api/community/data-rights?email=xxx
// Check what data we have for an email (preview before full export)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json(
      { success: false, message: 'Email parameter is required' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()
  const { data: contact } = await supabase
    .from('contacts')
    .select('email, first_name, subscriptions, consent_given, created_at')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!contact) {
    return NextResponse.json({
      success: true,
      found: false,
      message: 'No data found for this email address',
    })
  }

  return NextResponse.json({
    success: true,
    found: true,
    preview: {
      email: contact.email,
      hasFirstName: !!contact.first_name,
      subscriptions: contact.subscriptions,
      consentGiven: contact.consent_given,
      memberSince: contact.created_at,
    },
    actions: {
      export: 'POST /api/community/data-rights with { email, type: "export" }',
      delete: 'POST /api/community/data-rights with { email, type: "delete" }',
    },
  })
}
