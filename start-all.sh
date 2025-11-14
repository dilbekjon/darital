#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Darital - Starting All Services     ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}🔄 Killing process on port $1...${NC}"
    lsof -ti:$1 | xargs kill -9 2>/dev/null
    sleep 2
}

# Clean up ports if needed
echo -e "${YELLOW}📋 Checking ports...${NC}"
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 (Backend API) is in use${NC}"
    kill_port 3001
fi

if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 (Admin Web) is in use${NC}"
    kill_port 3000
fi

if check_port 3002; then
    echo -e "${YELLOW}⚠️  Port 3002 (Tenant Portal) is in use${NC}"
    kill_port 3002
fi

if check_port 8081; then
    echo -e "${YELLOW}⚠️  Port 8081 (Metro Bundler) is in use${NC}"
    kill_port 8081
fi

echo ""

# Start Backend API (includes Telegram Bot)
echo -e "${GREEN}🚀 Starting Backend API (with Telegram Bot)...${NC}"
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/api"
pnpm run dev > /tmp/darital-api.log 2>&1 &
API_PID=$!
echo -e "${BLUE}   PID: $API_PID${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for Backend API to be ready...${NC}"
BACKEND_READY=false
for i in {1..60}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        BACKEND_READY=true
        echo -e "${GREEN}✅ Backend API is ready!${NC}"
        break
    fi
    if [ $((i % 5)) -eq 0 ]; then
        echo -e "${YELLOW}   Still waiting... (${i}s)${NC}"
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    echo -e "${RED}⚠️  Backend API is taking longer than expected${NC}"
    echo -e "${YELLOW}   Check logs: tail -f /tmp/darital-api.log${NC}"
    echo -e "${YELLOW}   Continuing anyway...${NC}"
fi

# Start Admin Web App
echo -e "${GREEN}🌐 Starting Admin Web App...${NC}"
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/admin-web"
rm -rf .next/cache .next/dev/lock 2>/dev/null
pnpm run dev > /tmp/darital-admin.log 2>&1 &
ADMIN_PID=$!
echo -e "${BLUE}   PID: $ADMIN_PID${NC}"

# Wait for admin web to be ready
echo -e "${YELLOW}⏳ Waiting for Admin Web to be ready...${NC}"
ADMIN_READY=false
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        ADMIN_READY=true
        echo -e "${GREEN}✅ Admin Web is ready!${NC}"
        break
    fi
    sleep 1
done

# Start Tenant Portal
echo -e "${GREEN}👥 Starting Tenant Portal...${NC}"
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/tenant-web"
rm -rf .next/cache .next/dev/lock 2>/dev/null
pnpm run dev > /tmp/darital-tenant.log 2>&1 &
TENANT_PID=$!
echo -e "${BLUE}   PID: $TENANT_PID${NC}"

# Wait for tenant portal to be ready
echo -e "${YELLOW}⏳ Waiting for Tenant Portal to be ready...${NC}"
TENANT_READY=false
for i in {1..30}; do
    if curl -s http://localhost:3002 > /dev/null 2>&1; then
        TENANT_READY=true
        echo -e "${GREEN}✅ Tenant Portal is ready!${NC}"
        break
    fi
    sleep 1
done

# Start Mobile App
echo -e "${GREEN}📱 Starting Mobile App (Expo)...${NC}"
cd "/Users/dilbekalmurotov/Desktop/Darital Final/apps/mobile"
pnpm start > /tmp/darital-mobile.log 2>&1 &
MOBILE_PID=$!
echo -e "${BLUE}   PID: $MOBILE_PID${NC}"
sleep 8

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All Services Started Successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"
echo ""

# Check Backend API
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API: Running on http://localhost:3001${NC}"
    echo -e "${BLUE}   📚 Swagger Docs: http://localhost:3001/docs${NC}"
    # Check if Telegram bot is enabled
    if grep -q "Telegram bot is ENABLED" /tmp/darital-api.log 2>/dev/null || grep -q "Telegram bot initialized successfully" /tmp/darital-api.log 2>/dev/null; then
        echo -e "${GREEN}   🤖 Telegram Bot: Enabled and running${NC}"
    elif grep -q "Telegram bot is DISABLED" /tmp/darital-api.log 2>/dev/null; then
        echo -e "${YELLOW}   🤖 Telegram Bot: Disabled (set TELEGRAM_ENABLE=true to enable)${NC}"
    else
        echo -e "${BLUE}   🤖 Telegram Bot: Status unknown (check logs)${NC}"
    fi
else
    echo -e "${RED}⏳ Backend API: Starting... (check logs: tail -f /tmp/darital-api.log)${NC}"
fi

# Check Admin Web
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Admin Panel: Running on http://localhost:3000${NC}"
else
    echo -e "${RED}⏳ Admin Panel: Starting... (check logs: tail -f /tmp/darital-admin.log)${NC}"
fi

# Check Tenant Portal
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tenant Portal: Running on http://localhost:3002${NC}"
else
    echo -e "${RED}⏳ Tenant Portal: Starting... (check logs: tail -f /tmp/darital-tenant.log)${NC}"
fi

# Check Mobile App
if check_port 8081; then
    echo -e "${GREEN}✅ Mobile App: Running (Metro Bundler on port 8081)${NC}"
    echo -e "${BLUE}   📱 Scan QR code in terminal or check Expo DevTools${NC}"
else
    echo -e "${RED}⏳ Mobile App: Starting... (check logs: tail -f /tmp/darital-mobile.log)${NC}"
fi

echo ""
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Process IDs (for manual stop if needed):${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${BLUE}Backend API:    $API_PID${NC}"
echo -e "${BLUE}Admin Panel:    $ADMIN_PID${NC}"
echo -e "${BLUE}Tenant Portal:  $TENANT_PID${NC}"
echo -e "${BLUE}Mobile App:     $MOBILE_PID${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   • View logs: tail -f /tmp/darital-{api|admin|tenant|mobile}.log"
echo -e "   • Stop all: ./stop-all.sh"
echo -e "   • Stop individual: kill <PID>"
echo ""
echo -e "${GREEN}🎉 Ready to use Darital!${NC}"
echo ""
echo -e "${GREEN}📍 Service URLs:${NC}"
echo -e "${GREEN}   Admin Panel:   http://localhost:3000${NC}"
echo -e "${GREEN}   Tenant Portal: http://localhost:3002${NC}"
echo -e "${GREEN}   Backend API:   http://localhost:3001/api${NC}"
echo -e "${GREEN}   Swagger Docs:  http://localhost:3001/docs${NC}"
echo ""
echo -e "${BLUE}📝 Note: Telegram Bot starts automatically with Backend API${NC}"
echo -e "${BLUE}   (Requires TELEGRAM_ENABLE=true and TELEGRAM_BOT_TOKEN in .env)${NC}"
echo ""

