/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com', 'images.unsplash.com'],
  },
}

module.exports = nextConfig
