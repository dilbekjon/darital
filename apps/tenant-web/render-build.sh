#!/bin/bash
# Build script for Render deployment

set -e

echo "Installing dependencies..."
npm install

echo "Building Next.js application..."
cd apps/tenant-web
npm run build

echo "Build completed successfully!"
