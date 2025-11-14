#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌐 Starting Admin Web App...${NC}"
echo ""

# Check if port 3000 is in use
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    echo -e "${YELLOW}   Stopping existing process...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Navigate to admin-web directory
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/admin-web"

# Start the web app
echo -e "${BLUE}📦 Installing dependencies (if needed)...${NC}"
pnpm install --silent

echo -e "${BLUE}🔄 Starting development server...${NC}"
echo ""
echo -e "${GREEN}📱 Admin Web will be available at: http://localhost:3000${NC}"
echo ""
pnpm run dev

# Note: This runs in foreground. For background, use: pnpm run dev &

