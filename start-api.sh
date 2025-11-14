#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Backend API...${NC}"
echo ""

# Check if port 3001 is in use
if lsof -ti:3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo -e "${YELLOW}   Stopping existing process...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Navigate to API directory
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/api"

# Start the API
echo -e "${BLUE}📦 Installing dependencies (if needed)...${NC}"
pnpm install --silent

echo -e "${BLUE}🔄 Starting development server...${NC}"
echo ""
pnpm run dev

# Note: This runs in foreground. For background, use: pnpm run dev &

