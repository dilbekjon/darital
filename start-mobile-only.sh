#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📱 Starting Mobile App (Expo)...${NC}"
echo ""

# Check if Metro Bundler port is in use
if lsof -ti:8081 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8081 (Metro Bundler) is already in use${NC}"
    echo -e "${YELLOW}   Stopping existing process...${NC}"
    lsof -ti:8081 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Navigate to mobile directory
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/mobile"

# Start the mobile app
echo -e "${BLUE}📦 Installing dependencies (if needed)...${NC}"
pnpm install --silent

echo -e "${BLUE}🔄 Starting Expo...${NC}"
echo ""
echo -e "${GREEN}📱 Scan the QR code with Expo Go app${NC}"
echo -e "${BLUE}   iOS: Camera app${NC}"
echo -e "${BLUE}   Android: Expo Go app${NC}"
echo ""
pnpm start

# Note: This runs in foreground. For background, use: pnpm start &

