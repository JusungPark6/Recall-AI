/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://recall-ai-app.vercel.app/api/:path*',
      },
    ]
  },
  experimental: {
    outputFileTracing: true,
    outputFileTracingIncludes: {
      '/api': [
        'main.py',      // main backend function
        'requirements.txt',  // Dependencies
        '**'            // Any other files in api directory
      ]
    }
  }
}

module.exports = nextConfig 