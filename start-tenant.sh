#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Darital Tenant Portal...${NC}"

# Navigate to tenant-web directory
cd "$(dirname "$0")/apps/tenant-web"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    pnpm install
fi

# Start the tenant portal on port 3002
echo -e "${GREEN}🌐 Starting Tenant Portal on http://localhost:3002${NC}"
pnpm run dev

