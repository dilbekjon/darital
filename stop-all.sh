#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   Darital - Stopping All Services     ║${NC}"
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local service=$2
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Stopping $service (port $port)...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
        sleep 1
        if lsof -ti:$port > /dev/null 2>&1; then
            echo -e "${RED}   ❌ Failed to stop $service${NC}"
        else
            echo -e "${GREEN}   ✅ $service stopped${NC}"
        fi
    else
        echo -e "${BLUE}   ℹ️  $service is not running${NC}"
    fi
}

# Stop all services
kill_port 3001 "Backend API"
kill_port 3000 "Admin Web"
kill_port 8081 "Metro Bundler (Mobile)"
kill_port 19000 "Expo DevTools"
kill_port 19001 "Expo Dev Server"
kill_port 19002 "Expo Tunnel"

# Kill any remaining node processes related to the project
echo ""
echo -e "${YELLOW}🔍 Cleaning up remaining processes...${NC}"
pkill -f "apps/api" 2>/dev/null && echo -e "${GREEN}   ✅ Stopped API processes${NC}"
pkill -f "apps/admin-web" 2>/dev/null && echo -e "${GREEN}   ✅ Stopped Web processes${NC}"
pkill -f "apps/mobile" 2>/dev/null && echo -e "${GREEN}   ✅ Stopped Mobile processes${NC}"
pkill -f "expo start" 2>/dev/null && echo -e "${GREEN}   ✅ Stopped Expo processes${NC}"

# Clean up log files
echo ""
echo -e "${YELLOW}🧹 Cleaning up log files...${NC}"
rm -f /tmp/darital-*.log 2>/dev/null && echo -e "${GREEN}   ✅ Log files cleaned${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All Services Stopped Successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

