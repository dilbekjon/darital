#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 Darital Mobile App Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get computer's IP
COMPUTER_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "🖥️  Computer IP: $COMPUTER_IP"
echo "📡 API URL: http://$COMPUTER_IP:3001/api"
echo ""

# Check if backend is running
echo "🔍 Checking backend API..."
if curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo "✅ Backend API is running on port 3001"
else
    echo "⚠️  Backend API is NOT running!"
    echo "   Please start it first:"
    echo "   cd apps/api && npm run start:dev"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi
echo ""

# Kill any existing Expo/Metro processes
echo "🔄 Killing existing Expo processes..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 3

# Navigate to mobile directory
cd "$(dirname "$0")/apps/mobile"

# Clear cache
echo "🗑️  Clearing cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Start Expo
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Expo dev server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 On your phone:"
echo "   1. Open Expo Go app"
echo "   2. Scan the QR code below"
echo "   3. Wait for app to load (30-60 seconds)"
echo ""
echo "💡 Make sure your phone and computer are on the SAME WiFi!"
echo ""

npx expo start --clear

