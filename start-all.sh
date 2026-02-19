#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Darital - Starting All Services     ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}📁 Project Root: $PROJECT_ROOT${NC}"
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

# Ensure PostgreSQL and Redis are running (backend needs them)
echo -e "${YELLOW}📋 Checking database and Redis...${NC}"
if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'darital-postgres'; then
        echo -e "${YELLOW}   Starting PostgreSQL and Redis (docker compose up -d postgres redis)...${NC}"
        cd "$PROJECT_ROOT"
        docker compose up -d postgres redis 2>/dev/null || true
        cd - > /dev/null
        echo -e "${YELLOW}   Waiting 5s for database to be ready...${NC}"
        sleep 5
    fi
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'darital-redis'; then
        echo -e "${YELLOW}   Starting Redis...${NC}"
        cd "$PROJECT_ROOT"
        docker compose up -d redis 2>/dev/null || true
        cd - > /dev/null
        sleep 2
    fi
else
    echo -e "${YELLOW}   Docker not running or not available. Ensure PostgreSQL and Redis are running for the backend.${NC}"
fi
if [ ! -f "$PROJECT_ROOT/apps/api/.env" ]; then
    echo -e "${YELLOW}   Creating apps/api/.env from .env.example (first run)...${NC}"
    cp "$PROJECT_ROOT/apps/api/.env.example" "$PROJECT_ROOT/apps/api/.env"
fi
# Run migrations so DB has tables (required before backend starts)
if command -v docker &> /dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'darital-postgres'; then
    echo -e "${YELLOW}   Applying database migrations...${NC}"
    (cd "$PROJECT_ROOT/apps/api" && pnpm exec prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null) || true
    if [ -f "$PROJECT_ROOT/apps/api/dist/rbac/seed.js" ]; then
        (cd "$PROJECT_ROOT/apps/api" && node dist/rbac/seed.js 2>/dev/null) || true
    fi
fi
echo ""

# Start Backend API (includes Telegram Bot)
echo -e "${GREEN}🚀 Starting Backend API (with Telegram Bot)...${NC}"
if [ ! -d "$PROJECT_ROOT/apps/api" ]; then
    echo -e "${RED}❌ Error: Backend API directory not found at $PROJECT_ROOT/apps/api${NC}"
    exit 1
fi
# Use dev:simple (build once + node) to avoid ENFILE from tsc watch on macOS
ulimit -n 10240 2>/dev/null || true
cd "$PROJECT_ROOT/apps/api"
pnpm run dev:simple > /tmp/darital-api.log 2>&1 &
API_PID=$!
echo -e "${BLUE}   PID: $API_PID${NC}"

# Wait for backend to be ready (first build can take 60–90s)
echo -e "${YELLOW}⏳ Waiting for Backend API to be ready (build + start, up to 120s)...${NC}"
BACKEND_READY=false
for i in $(seq 1 120); do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        BACKEND_READY=true
        echo -e "${GREEN}✅ Backend API is ready!${NC}"
        break
    fi
    if [ $((i % 10)) -eq 0 ]; then
        echo -e "${YELLOW}   Still waiting... (${i}s)${NC}"
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    echo -e "${RED}⚠️  Backend API is taking longer than expected${NC}"
    echo -e "${YELLOW}   Logs: tail -f /tmp/darital-api.log${NC}"
    echo -e "${YELLOW}   Common fixes: 1) Docker running?  2) docker compose up -d postgres redis  3) apps/api/.env with DATABASE_URL=postgresql://postgres:postgres@localhost:5432/darital${NC}"
    echo -e "${YELLOW}   Continuing anyway...${NC}"
fi

# Start Admin Web App
echo -e "${GREEN}🌐 Starting Admin Web App...${NC}"
if [ ! -d "$PROJECT_ROOT/apps/admin-web" ]; then
    echo -e "${RED}❌ Error: Admin Web directory not found at $PROJECT_ROOT/apps/admin-web${NC}"
    exit 1
fi
cd "$PROJECT_ROOT/apps/admin-web"
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
if [ ! -d "$PROJECT_ROOT/apps/tenant-web" ]; then
    echo -e "${RED}❌ Error: Tenant Portal directory not found at $PROJECT_ROOT/apps/tenant-web${NC}"
    exit 1
fi
cd "$PROJECT_ROOT/apps/tenant-web"
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
if [ ! -d "$PROJECT_ROOT/apps/mobile" ]; then
    echo -e "${RED}❌ Error: Mobile App directory not found at $PROJECT_ROOT/apps/mobile${NC}"
    echo -e "${YELLOW}   Skipping mobile app...${NC}"
    MOBILE_PID=""
else
    cd "$PROJECT_ROOT/apps/mobile"
    # Kill any existing Expo/Metro processes
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    pkill -f "expo start" 2>/dev/null || true
    pkill -f "metro" 2>/dev/null || true
    sleep 2
    
    # Clear log file
    > /tmp/darital-mobile.log
    
    # Clear Expo and Metro caches to avoid HMR errors
    cd "$PROJECT_ROOT/apps/mobile"
    echo -e "${YELLOW}   Clearing Expo cache...${NC}"
    rm -rf .expo/.cache 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    
    # Start Expo with cache cleared
    # Note: Visiting http://localhost:8081 tries to load web bundle which causes HMR errors
    # The QR code is better viewed via terminal output or expo-tools
    npx expo start --clear --lan > /tmp/darital-mobile.log 2>&1 &
    MOBILE_PID=$!
    echo -e "${BLUE}   PID: $MOBILE_PID${NC}"
    echo -e "${YELLOW}⏳ Waiting for Expo to start (this may take 10-15 seconds)...${NC}"
    
    # Wait for Expo to be ready (check if port 8081 is listening)
    EXPO_READY=false
    for i in {1..30}; do
        if check_port 8081; then
            EXPO_READY=true
            sleep 5  # Give Expo time to generate QR code and connection info
            break
        fi
        sleep 1
    done
    
    # Try to extract the exp:// URL and QR code info from logs
    sleep 3  # Wait for logs to be written
    EXP_URL=$(grep -o "exp://[^[:space:]]*" /tmp/darital-mobile.log 2>/dev/null | head -1 || echo "")
    LAN_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' || echo "your-ip")
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}📱 Mobile App QR Code${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Note: http://localhost:8081 shows web bundle (causes HMR error)${NC}"
    echo -e "${YELLOW}   The QR code is best viewed in terminal output below${NC}"
    echo ""
    if [ -n "$EXP_URL" ]; then
        echo -e "${GREEN}📱 Connection URL:${NC}"
        echo -e "${BLUE}   $EXP_URL${NC}"
        echo ""
        echo -e "${YELLOW}💡 To scan with Expo Go app:${NC}"
        echo -e "${BLUE}   1. Open Expo Go app on your phone${NC}"
        echo -e "${BLUE}   2. Tap 'Enter URL manually'${NC}"
        echo -e "${BLUE}   3. Enter: $EXP_URL${NC}"
        echo ""
    fi
    echo -e "${YELLOW}📱 To view QR code:${NC}"
    echo -e "${BLUE}   tail -f /tmp/darital-mobile.log${NC}"
    echo ""
fi

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
    # Wait a moment for logs to be written, then check Telegram bot status
    sleep 2
    if grep -q "Telegram bot is ENABLED" /tmp/darital-api.log 2>/dev/null || grep -q "Telegram bot initialized successfully" /tmp/darital-api.log 2>/dev/null; then
        echo -e "${GREEN}   🤖 Telegram Bot: Enabled and running${NC}"
    elif grep -q "Telegram bot is DISABLED" /tmp/darital-api.log 2>/dev/null || grep -q "Telegram bot disabled" /tmp/darital-api.log 2>/dev/null; then
        echo -e "${YELLOW}   🤖 Telegram Bot: Disabled${NC}"
        echo -e "${YELLOW}      Set TELEGRAM_ENABLE=true and TELEGRAM_BOT_TOKEN in apps/api/.env${NC}"
    else
        echo -e "${BLUE}   🤖 Telegram Bot: Status unknown (check logs: tail -f /tmp/darital-api.log)${NC}"
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
if [ -n "$MOBILE_PID" ]; then
    if check_port 8081; then
        echo -e "${GREEN}✅ Mobile App: Running (Metro Bundler on port 8081)${NC}"
        echo -e "${BLUE}   📱 QR Code: See above or visit http://localhost:8081${NC}"
        echo -e "${BLUE}   📝 Logs: tail -f /tmp/darital-mobile.log${NC}"
    else
        echo -e "${RED}⏳ Mobile App: Starting... (check logs: tail -f /tmp/darital-mobile.log)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Mobile App: Not started (directory not found)${NC}"
fi

echo ""
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 Process IDs (for manual stop if needed):${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${BLUE}Backend API:    $API_PID${NC}"
echo -e "${BLUE}Admin Panel:    $ADMIN_PID${NC}"
echo -e "${BLUE}Tenant Portal:  $TENANT_PID${NC}"
if [ -n "$MOBILE_PID" ]; then
    echo -e "${BLUE}Mobile App:     $MOBILE_PID${NC}"
else
    echo -e "${YELLOW}Mobile App:     Not started${NC}"
fi
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
if [ -n "$MOBILE_PID" ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}📱 MOBILE APP CONNECTION${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Note: http://localhost:8081 loads web bundle (causes HMR error)${NC}"
    echo ""
    echo -e "${YELLOW}📱 Best way to get QR code:${NC}"
    echo -e "${BLUE}   1. View in terminal: tail -f /tmp/darital-mobile.log${NC}"
    echo -e "${BLUE}   2. Look for the 'exp://' URL in the output above${NC}"
    echo ""
    echo -e "${YELLOW}📲 How to connect:${NC}"
    echo -e "${BLUE}   • iOS: Camera app or Expo Go app${NC}"
    echo -e "${BLUE}   • Android: Expo Go app${NC}"
    echo -e "${BLUE}   • Use 'Enter URL manually' option in Expo Go${NC}"
    echo ""
fi
echo -e "${BLUE}📝 Note: Telegram Bot starts automatically with Backend API${NC}"
echo -e "${BLUE}   (Requires TELEGRAM_ENABLE=true and TELEGRAM_BOT_TOKEN in .env)${NC}"
echo ""

