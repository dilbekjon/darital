#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Darital - Service Status Check      ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
    return $?
}

# Function to check service health
check_service() {
    local name=$1
    local port=$2
    local url=$3
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}$name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if check_port $port; then
        echo -e "  Status: ${GREEN}✅ RUNNING${NC}"
        echo -e "  Port:   ${BLUE}$port${NC}"
        
        if [ ! -z "$url" ]; then
            echo -e "  URL:    ${BLUE}$url${NC}"
            
            # Try to get response
            if curl -s "$url" > /dev/null 2>&1; then
                echo -e "  Health: ${GREEN}✅ RESPONDING${NC}"
            else
                echo -e "  Health: ${YELLOW}⚠️  NO RESPONSE${NC}"
            fi
        fi
        
        # Show process info
        local pid=$(lsof -ti:$port)
        echo -e "  PID:    ${BLUE}$pid${NC}"
    else
        echo -e "  Status: ${RED}❌ NOT RUNNING${NC}"
        echo -e "  Port:   ${BLUE}$port${NC}"
    fi
    echo ""
}

# Check each service
check_service "Backend API" 3001 "http://localhost:3001/api/health"
check_service "Admin Web App" 3000 "http://localhost:3000"
check_service "Mobile App (Metro)" 8081 ""
check_service "Expo DevTools" 19000 ""

# Check database
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}PostgreSQL Database${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if check_port 5432; then
    echo -e "  Status: ${GREEN}✅ RUNNING${NC}"
    echo -e "  Port:   ${BLUE}5432${NC}"
else
    echo -e "  Status: ${RED}❌ NOT RUNNING${NC}"
    echo -e "  Port:   ${BLUE}5432${NC}"
fi
echo ""

# Check Redis
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Redis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if check_port 6379; then
    echo -e "  Status: ${GREEN}✅ RUNNING${NC}"
    echo -e "  Port:   ${BLUE}6379${NC}"
    
    # Try to ping Redis
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "  Health: ${GREEN}✅ RESPONDING${NC}"
    else
        echo -e "  Health: ${YELLOW}⚠️  NOT ACCESSIBLE${NC}"
    fi
else
    echo -e "  Status: ${RED}❌ NOT RUNNING${NC}"
    echo -e "  Port:   ${BLUE}6379${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Summary                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

running=0
total=6

check_port 3001 && ((running++))
check_port 3000 && ((running++))
check_port 8081 && ((running++))
check_port 19000 && ((running++))
check_port 5432 && ((running++))
check_port 6379 && ((running++))

echo -e "${YELLOW}Services Running: $running / $total${NC}"
echo ""

if [ $running -eq $total ]; then
    echo -e "${GREEN}✨ All systems operational!${NC}"
elif [ $running -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some services are not running${NC}"
    echo -e "${BLUE}   Run: ./start-all.sh to start all services${NC}"
else
    echo -e "${RED}❌ No services are running${NC}"
    echo -e "${BLUE}   Run: ./start-all.sh to start all services${NC}"
fi

echo ""
echo -e "${BLUE}💡 Quick Actions:${NC}"
echo -e "   ${GREEN}Start all:${NC}  ./start-all.sh"
echo -e "   ${RED}Stop all:${NC}   ./stop-all.sh"
echo -e "   ${BLUE}View logs:${NC}  tail -f /tmp/darital-*.log"
echo ""

