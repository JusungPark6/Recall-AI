/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8000/:path*'
          : process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
    ]
  },
}

module.exports = nextConfig 