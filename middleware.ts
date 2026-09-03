import { NextResponse, type NextRequest } from 'next/server'

// Single-user deployment: HTTP Basic auth gate via env vars.
// Set BASIC_AUTH_USER + BASIC_AUTH_PASS in Coolify. With both unset (e.g. local dev),
// the middleware allows everything through.

export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASS
  if (!user || !pass) return NextResponse.next()

  const expected = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  const provided = request.headers.get('authorization')
  if (provided === expected) return NextResponse.next()

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="BLKOUT CRM"',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}

export const config = {
  matcher: [
    // Skip Next.js internals + static assets, and the public endpoints called
    // cross-origin from the blkoutuk.com sites (join/share/data-rights, the
    // legacy subscribe alias, and health). A browser never sends Authorization
    // on a CORS preflight, so gating these here 401'd every public newsletter
    // signup from 29 Apr to 3 Sep 2026.
    '/((?!_next/static|_next/image|favicon.ico|api/community|api/newsletter|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
