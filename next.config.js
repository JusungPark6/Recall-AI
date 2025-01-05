/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.VERCEL_ENV === 'production') {
      return [
        {
          source: '/api/:path*',
          destination: '/api/main.py',
        },
      ];
    }
    else {
      return [
        {
          source: '/api/:path*',
          destination: '/api/main.py',
        },
      ];
    }
  },
}

module.exports = nextConfig 