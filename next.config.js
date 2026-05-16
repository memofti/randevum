/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'mqaqwqomabsctozeuryf.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  eslint: { ignoreDuringBuilds: true },
}
module.exports = nextConfig
