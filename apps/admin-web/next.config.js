/** @type {import('next').NextConfig} */
const path = require('path'); // Import path module

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  outputFileTracingRoot: path.join(__dirname, '../../'), // Moved from experimental
}

module.exports = nextConfig

