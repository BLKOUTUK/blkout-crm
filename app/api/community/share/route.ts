import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/**
 * GET /api/community/share?email=xxx
 * Returns share link and stats for a member
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json(
      { success: false, message: 'Email is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  const supabase = getSupabase()

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('id, first_name, referral_code, referral_count')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !contact) {
    return NextResponse.json(
      { success: false, message: 'Contact not found' },
      { status: 404, headers: corsHeaders }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.blkoutuk.cloud'
  const shareUrl = `${baseUrl}/join?ref=${contact.referral_code}`

  return NextResponse.json(
    {
      success: true,
      data: {
        firstName: contact.first_name,
        referralCode: contact.referral_code,
        referralCount: contact.referral_count || 0,
        shareUrl,
        shareLinks: {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(`Join the BLKOUT community - a platform for Black queer men in the UK: ${shareUrl}`)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join @BLKOUTUK - a community-owned platform for Black queer men in the UK`)}&url=${encodeURIComponent(shareUrl)}`,
          email: `mailto:?subject=${encodeURIComponent('Join the BLKOUT community')}&body=${encodeURIComponent(`Hey,\n\nI thought you might be interested in BLKOUT - a community-owned platform for Black queer men in the UK.\n\nJoin here: ${shareUrl}\n\nSee you there!`)}`,
          copy: shareUrl,
        },
      },
    },
    { headers: corsHeaders }
  )
}

/**
 * POST /api/community/share/click
 * Track share link clicks for analytics
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { referralCode, source } = body

    if (!referralCode) {
      return NextResponse.json(
        { success: false, message: 'Referral code is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabase()

    await supabase.from('share_link_clicks').insert({
      referral_code: referralCode.toUpperCase(),
      source: source || 'direct',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Share click tracking error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to track click' },
      { status: 500, headers: corsHeaders }
    )
  }
}
