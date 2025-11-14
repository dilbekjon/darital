#!/bin/bash

# Quick Test Script for Tenant Chat Foreign Key Fix
# Run this script to verify everything works end-to-end

set -e  # Exit on error

echo "🧪 Testing Tenant Chat - Foreign Key Fix"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API is running
echo -e "${YELLOW}Step 1:${NC} Checking if API is running..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ API is running on port 3001${NC}"
else
    echo -e "${RED}❌ API is not running. Start it with: cd apps/api && pnpm run dev${NC}"
    exit 1
fi
echo ""

# Get token from user
echo -e "${YELLOW}Step 2:${NC} Authentication"
echo "Open your browser and:"
echo "1. Navigate to http://localhost:3000/login"
echo "2. Login as a tenant"
echo "3. Open DevTools Console (F12)"
echo "4. Run: localStorage.getItem('accessToken')"
echo "5. Copy the token"
echo ""
read -p "Paste your access token here: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No token provided${NC}"
    exit 1
fi

# Decode token to show user info
echo -e "${YELLOW}Step 3:${NC} Decoding token..."
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "{}")
EMAIL=$(echo $PAYLOAD | grep -o '"email":"[^"]*' | cut -d'"' -f4)
ROLE=$(echo $PAYLOAD | grep -o '"role":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$EMAIL" ]; then
    echo -e "${GREEN}✅ Authenticated as: $EMAIL ($ROLE)${NC}"
else
    echo -e "${YELLOW}⚠️  Could not decode token, continuing anyway...${NC}"
fi
echo ""

# Test 1: GET conversations
echo -e "${YELLOW}Test 1:${NC} GET /api/conversations"
echo "------------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/conversations \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "Response: Found $COUNT conversation(s)"
    echo "$BODY" | head -n 20
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: POST create conversation
echo -e "${YELLOW}Test 2:${NC} POST /api/conversations (Create conversation)"
echo "------------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message from script"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    CONV_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    TENANT_ID=$(echo "$BODY" | grep -o '"tenantId":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$CONV_ID" ]; then
        echo -e "${GREEN}✅ Conversation created: $CONV_ID${NC}"
        echo -e "${GREEN}✅ Tenant ID: $TENANT_ID${NC}"
        echo "Response preview:"
        echo "$BODY" | head -n 15
        
        # Test 3: GET messages
        echo ""
        echo -e "${YELLOW}Test 3:${NC} GET /api/conversations/$CONV_ID/messages"
        echo "------------------------------------------------"
        MSG_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/conversations/$CONV_ID/messages \
          -H "Authorization: Bearer $TOKEN")
        
        MSG_HTTP_CODE=$(echo "$MSG_RESPONSE" | tail -n1)
        MSG_BODY=$(echo "$MSG_RESPONSE" | sed '$d')
        
        if [ "$MSG_HTTP_CODE" == "200" ]; then
            echo -e "${GREEN}✅ Status: $MSG_HTTP_CODE${NC}"
            MSG_COUNT=$(echo "$MSG_BODY" | grep -o '"id"' | wc -l | tr -d ' ')
            echo "Found $MSG_COUNT message(s)"
            echo "$MSG_BODY" | head -n 20
        else
            echo -e "${RED}❌ Status: $MSG_HTTP_CODE${NC}"
            echo "Response: $MSG_BODY"
        fi
    fi
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}🎉 Test Complete!${NC}"
echo ""
echo "Expected Results:"
echo "✅ Test 1: 200 OK - Lists tenant's conversations"
echo "✅ Test 2: 200/201 - Creates conversation with correct tenantId"
echo "✅ Test 3: 200 OK - Returns messages for the conversation"
echo ""
echo "If all tests passed, the foreign key fix is working! 🚀"
echo ""
echo "Check backend logs for detailed information:"
echo "  tail -f /tmp/api-final-test.log | grep ChatService"

