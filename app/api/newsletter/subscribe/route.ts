import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated Use /api/community/join instead
 *
 * This endpoint maintains backward compatibility for existing integrations.
 * New integrations should use /api/community/join with the full request format.
 */

interface LegacyRequest {
  email: string
  firstName?: string
}

interface NewJoinRequest {
  email: string
  firstName?: string
  subscriptions: {
    newsletter: boolean
    events: boolean
    blkouthub: boolean
    volunteer: boolean
  }
  consentGiven: boolean
  source: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LegacyRequest = await request.json()

    // Transform legacy request to new unified format
    const unifiedRequest: NewJoinRequest = {
      email: body.email,
      firstName: body.firstName,
      subscriptions: {
        newsletter: true, // This was a newsletter-only endpoint
        events: false,
        blkouthub: false,
        volunteer: false,
      },
      consentGiven: true, // Legacy endpoint implied consent
      source: 'legacy_newsletter_widget',
    }

    // Get the base URL for internal redirect
    const baseUrl = request.nextUrl.origin

    // Forward to the unified endpoint
    const response = await fetch(`${baseUrl}/api/community/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'user-agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(unifiedRequest),
    })

    const result = await response.json()

    // Add deprecation notice to response
    return NextResponse.json(
      {
        ...result,
        _deprecated: true,
        _deprecationNotice: 'This endpoint is deprecated. Please use /api/community/join instead.',
      },
      {
        status: response.status,
        headers: {
          'Deprecation': 'true',
          'Link': '</api/community/join>; rel="successor-version"',
        },
      }
    )
  } catch (error) {
    console.error('Legacy newsletter subscription error:', error)
    return NextResponse.json(
      {
        error: 'Failed to subscribe',
        _deprecated: true,
        _deprecationNotice: 'This endpoint is deprecated. Please use /api/community/join instead.',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for status check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'This endpoint is deprecated. Please use /api/community/join instead.',
      newEndpoint: '/api/community/join',
      documentation: '/api/community/join returns consent text and version via GET',
    },
    {
      headers: {
        'Deprecation': 'true',
        'Link': '</api/community/join>; rel="successor-version"',
      },
    }
  )
}
