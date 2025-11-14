#!/bin/bash

# START_MOBILE_CLEAN.sh - Clean start for Expo mobile app
# Clears all caches and ensures expo-secure-store is properly loaded

echo "🧹 Cleaning all caches..."

cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/mobile"

# Kill any existing Metro bundler processes
echo "🔪 Killing existing Metro bundler processes..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true

# Clear Metro bundler cache
echo "🗑️  Clearing Metro bundler cache..."
rm -rf .metro

# Clear Expo cache
echo "🗑️  Clearing Expo cache..."
rm -rf .expo

# Clear node_modules cache
echo "🗑️  Clearing node_modules cache..."
rm -rf node_modules/.cache

# Clear watchman cache
echo "🗑️  Clearing watchman cache..."
watchman watch-del-all 2>/dev/null || true

echo ""
echo "✅ All caches cleared!"
echo ""
echo "🚀 Starting Expo development server with clean cache..."
echo ""
echo "⚠️  IMPORTANT:"
echo "   - expo-secure-store is now installed (v15.0.7)"
echo "   - Test on REAL device (Face ID doesn't work in simulator)"
echo "   - Scan QR code with Expo Go app"
echo ""

# Start Expo with cache clearing
npx expo start --clear

echo ""
echo "✅ Expo server started!"

