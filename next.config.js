/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com', 'images.unsplash.com'],
  },
  // Finance is one system, not two (10 Sep 2026). /financial read
  // public.financial_transactions, which has never held a row; the society's books are
  // the bookkeeping pipeline, published to comms /admin/finance. Permanent, so anything
  // holding the old link — a bookmark, another page, a search result — follows it there
  // rather than landing on an empty ledger.
  async redirects() {
    return [
      {
        source: '/financial',
        destination: 'https://comms.blkoutuk.com/admin/finance',
        permanent: true,
      },
      {
        source: '/financial/:path*',
        destination: 'https://comms.blkoutuk.com/admin/finance',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
