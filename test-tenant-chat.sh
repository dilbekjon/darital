#!/bin/bash

# Test Tenant Chat Fix
# This script tests the tenant chat endpoints with proper authentication

echo "🧪 Testing Tenant Chat Endpoints"
echo "================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get your token from browser localStorage
echo -e "${YELLOW}📝 Instructions:${NC}"
echo "1. Open your browser Developer Console (F12)"
echo "2. Go to the Console tab"
echo "3. Run: localStorage.getItem('accessToken')"
echo "4. Copy the token (without quotes)"
echo ""
read -p "Paste your access token here: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ No token provided${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token received${NC}"
echo ""

# Test 1: Get conversations
echo "Test 1: GET /api/conversations"
echo "================================"
RESPONSE=$(curl -s -X GET http://localhost:3001/api/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ]; then
  echo -e "${GREEN}✅ Status: $HTTP_STATUS${NC}"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Create conversation
echo "Test 2: POST /api/conversations"
echo "================================"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"content":"Hello, I need help with my invoice"}' \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "201" ]; then
  echo -e "${GREEN}✅ Status: $HTTP_STATUS${NC}"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  # Extract conversation ID for next test
  CONV_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
  
  if [ ! -z "$CONV_ID" ] && [ "$CONV_ID" != "null" ]; then
    echo ""
    echo "Test 3: GET /api/conversations/$CONV_ID/messages"
    echo "=================================================="
    RESPONSE=$(curl -s -X GET "http://localhost:3001/api/conversations/$CONV_ID/messages" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Accept: application/json" \
      -w "\nHTTP_STATUS:%{http_code}")
    
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$HTTP_STATUS" == "200" ]; then
      echo -e "${GREEN}✅ Status: $HTTP_STATUS${NC}"
      echo "Response:"
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
      echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
      echo "Response: $BODY"
    fi
  fi
else
  echo -e "${RED}❌ Status: $HTTP_STATUS${NC}"
  echo "Response: $BODY"
fi

echo ""
echo "================================="
echo -e "${GREEN}🎉 Tests Complete!${NC}"
echo ""
echo "Check the API server logs for detailed logging:"
echo "  tail -f /tmp/api-dev.log"

