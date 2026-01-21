#!/bin/bash
# Build script for Render deployment

set -e

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
cd apps/api
npx prisma generate

echo "Building application..."
npm run build

echo "Build completed successfully!"
