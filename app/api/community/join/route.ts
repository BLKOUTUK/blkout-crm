import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// CORS configuration - allow all BLKOUT domains
const ALLOWED_ORIGINS = [
  'https://crm.blkoutuk.cloud',
  'https://blkoutuk.com',
  'https://news.blkoutuk.cloud',
  'https://events.blkoutuk.cloud',
  'https://blog.blkoutuk.cloud',
  'https://ivor.blkoutuk.cloud',
  'https://comms.blkoutuk.cloud',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
]

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

// Consent text - update version when changing
const CONSENT_VERSION = '1.0'
const CONSENT_TEXT = `I understand that BLKOUT will:
- Store my email and optional name securely on UK-hosted servers
- Send me updates based on my subscription preferences
- Never sell or share my data with third parties
- Allow me to access, export, or delete my data at any time

I agree to the BLKOUT Privacy Policy (version ${CONSENT_VERSION}).`

// Types
interface JoinRequest {
  email: string
  firstName?: string
  subscriptions: {
    newsletter: boolean
    events: boolean
    blkouthub: boolean
    volunteer: boolean
  }
  consentGiven: boolean
  source?: string
  sourceUrl?: string
  referrer?: string
  referrerCode?: string // Referral code from existing member
}

interface JoinResponse {
  success: boolean
  message: string
  contactId?: string
  blkouthubInviteSent?: boolean
  referralCode?: string // New member's own referral code
  shareUrl?: string // Pre-built share URL
}

// Generate a unique 8-character referral code
function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

// POST /api/community/join
export async function POST(request: NextRequest): Promise<NextResponse<JoinResponse>> {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const body: JoinRequest = await request.json()

    // Validate required fields
    if (!body.email || !isValidEmail(body.email)) {
      return NextResponse.json(
        { success: false, message: 'Valid email is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!body.consentGiven) {
      return NextResponse.json(
        { success: false, message: 'Consent is required to join' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Initialize Supabase client (lazy to avoid build-time errors)
    const supabase = getSupabase()

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, subscriptions, consent_given, referral_code')
      .eq('email', body.email.toLowerCase().trim())
      .single()

    const consentTextHash = crypto
      .createHash('sha256')
      .update(CONSENT_TEXT)
      .digest('hex')

    let contactId: string
    let isNewContact = false
    let referralCode: string

    // Look up referrer if code provided
    let referrerId: string | null = null
    if (body.referrerCode) {
      const { data: referrer } = await supabase
        .from('contacts')
        .select('id')
        .eq('referral_code', body.referrerCode.toUpperCase())
        .single()

      if (referrer) {
        referrerId = referrer.id
      }
    }

    if (existingContact) {
      // Update existing contact
      contactId = existingContact.id
      referralCode = existingContact.referral_code || generateReferralCode()

      // Merge subscriptions (don't remove existing ones)
      const mergedSubscriptions = {
        ...existingContact.subscriptions,
        ...body.subscriptions,
      }

      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          first_name: body.firstName || undefined,
          subscriptions: mergedSubscriptions,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          consent_method: 'signup_widget_v1',
          consent_text_hash: consentTextHash,
          privacy_policy_version: CONSENT_VERSION,
          referral_code: referralCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)

      if (updateError) throw updateError
    } else {
      // Create new contact
      isNewContact = true
      referralCode = generateReferralCode()

      const { data: newContact, error: insertError } = await supabase
        .from('contacts')
        .insert({
          email: body.email.toLowerCase().trim(),
          first_name: body.firstName || null,
          contact_type: ['subscriber'],
          status: 'active',
          subscriptions: body.subscriptions,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          consent_method: 'signup_widget_v1',
          consent_text_hash: consentTextHash,
          privacy_policy_version: CONSENT_VERSION,
          signup_source: body.source || 'widget',
          signup_source_url: body.sourceUrl || null,
          signup_referrer: body.referrer || null,
          referred_by_id: referrerId,
          referral_code: referralCode,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      contactId = newContact.id

      // Track the referral if there was a referrer
      if (referrerId) {
        await supabase.from('referrals').insert({
          referrer_id: referrerId,
          referred_id: contactId,
          referral_code: body.referrerCode?.toUpperCase(),
          status: 'completed',
        })

        // Increment referrer's count
        await supabase.rpc('increment_referral_count', { contact_id: referrerId })
      }
    }

    // Log consent in audit trail
    await supabase.from('consent_audit_log').insert({
      contact_id: contactId,
      action: isNewContact ? 'consent_given' : 'subscription_changed',
      details: {
        subscriptions: body.subscriptions,
        source: body.source,
        isNewContact,
        referrerCode: body.referrerCode || null,
      },
      consent_text: CONSENT_TEXT,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    // Handle external platform syncs
    let blkouthubInviteSent = false

    // Sync to SendFox if newsletter subscription
    if (body.subscriptions.newsletter) {
      await syncToSendFox(body.email, body.firstName)
    }

    // Send BLKOUTHUB invitation if requested
    if (body.subscriptions.blkouthub) {
      blkouthubInviteSent = await sendBlkouthubInvitation(
        supabase,
        contactId,
        body.email,
        body.firstName
      )
    }

    // Build share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.blkoutuk.cloud'
    const shareUrl = `${baseUrl}/join?ref=${referralCode}`

    return NextResponse.json(
      {
        success: true,
        message: getWelcomeMessage(body.subscriptions, isNewContact),
        contactId,
        blkouthubInviteSent,
        referralCode,
        shareUrl,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Community join error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process signup. Please try again.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Generate welcome message based on subscriptions
function getWelcomeMessage(
  subscriptions: JoinRequest['subscriptions'],
  isNew: boolean
): string {
  const parts: string[] = []

  if (subscriptions.newsletter) {
    parts.push('weekly community updates')
  }
  if (subscriptions.events) {
    parts.push('event notifications')
  }
  if (subscriptions.blkouthub) {
    parts.push('a BLKOUTHUB invitation (check your email)')
  }
  if (subscriptions.volunteer) {
    parts.push("volunteer opportunities - we'll be in touch")
  }

  if (parts.length === 0) {
    return isNew
      ? 'Welcome to BLKOUT! Your preferences have been saved.'
      : 'Your preferences have been updated.'
  }

  const joined = parts.join(', ').replace(/, ([^,]*)$/, ' and $1')
  return isNew
    ? `Welcome to BLKOUT! You'll receive ${joined}.`
    : `Your preferences have been updated. You'll receive ${joined}.`
}

// Sync contact to SendFox for email delivery
async function syncToSendFox(email: string, firstName?: string): Promise<void> {
  const sendfoxFormUrl = process.env.NEXT_PUBLIC_SENDFOX_FORM_URL
  if (!sendfoxFormUrl) return

  try {
    const formData = new URLSearchParams()
    formData.append('email', email)
    if (firstName) {
      formData.append('first_name', firstName)
    }

    await fetch(sendfoxFormUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
  } catch (error) {
    console.error('SendFox sync failed:', error)
    // Non-blocking - we still have the data in Supabase
  }
}

// Send BLKOUTHUB (Heartbeat.chat) invitation
async function sendBlkouthubInvitation(
  supabase: ReturnType<typeof getSupabase>,
  contactId: string,
  email: string,
  firstName?: string
): Promise<boolean> {
  const heartbeatApiToken = process.env.HEARTBEAT_API_TOKEN
  const blkouthubCommunityId = process.env.BLKOUTHUB_COMMUNITY_ID

  // Create invitation record
  const invitationUrl = `https://blkouthub.com/invitation?code=BE862C&email=${encodeURIComponent(email)}`

  await supabase.from('blkouthub_invitations').insert({
    contact_id: contactId,
    email,
    invitation_url: invitationUrl,
    status: 'pending',
  })

  // If Heartbeat API is configured, send invitation via API
  if (heartbeatApiToken && blkouthubCommunityId) {
    try {
      const response = await fetch(
        `https://api.heartbeat.chat/v0/communities/${blkouthubCommunityId}/invitations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${heartbeatApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            name: firstName,
            message: `Welcome to BLKOUTHUB, ${firstName || 'friend'}! Join our community of Black queer men in the UK.`,
          }),
        }
      )

      if (response.ok) {
        await supabase
          .from('blkouthub_invitations')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('contact_id', contactId)
          .eq('email', email)

        await supabase
          .from('contacts')
          .update({ heartbeat_invite_sent_at: new Date().toISOString() })
          .eq('id', contactId)

        return true
      }
    } catch (error) {
      console.error('Heartbeat invitation failed:', error)
    }
  }

  return false
}

// GET /api/community/join - Return consent text and version
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  return NextResponse.json(
    {
      consentVersion: CONSENT_VERSION,
      consentText: CONSENT_TEXT,
      privacyPolicyUrl: 'https://blkoutuk.com/privacy',
      dataRequestUrl: 'https://blkoutuk.com/data-request',
    },
    { headers: corsHeaders }
  )
}
