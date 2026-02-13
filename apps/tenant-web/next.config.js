/** @type {import('next').NextConfig} */
function getApiUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.replace(/yourdomain\.uz/g, 'darital-arenda.uz');
}

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: getApiUrl(),
  },
  // For production deployment on different domain
  async rewrites() {
    const apiUrl = getApiUrl();
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

