#!/bin/bash

# Darital Deployment Script
# This script automates the deployment process to your server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/darital"
BRANCH="main"

echo -e "${GREEN}🚀 Starting Darital Deployment${NC}"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR" || exit 1

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from $BRANCH...${NC}"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# Build applications
echo -e "${YELLOW}🏗️ Building applications...${NC}"
NODE_ENV=production pnpm build

# Run database migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate deploy
cd ../..

# Restart PM2 processes
echo -e "${YELLOW}🔄 Restarting PM2 processes...${NC}"
pm2 restart all || pm2 start ecosystem.config.js

# Show status
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}📝 Recent Logs:${NC}"
pm2 logs --lines 10 --nostream

