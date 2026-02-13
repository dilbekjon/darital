/** @type {import('next').NextConfig} */
const path = require('path'); // Import path module

function getApiUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.replace(/yourdomain\.uz/g, 'darital-arenda.uz');
}

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_API_URL: getApiUrl(),
  },
  outputFileTracingRoot: path.join(__dirname, '../../'), // Moved from experimental
}

module.exports = nextConfig

