#!/bin/bash

# Rate Limiting Test Script
# This script tests the rate limiting implementation on the API

echo "=========================================="
echo "Rate Limiting Test Script"
echo "=========================================="
echo ""

# Configuration
API_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Login Rate Limit (5 requests per minute)
echo -e "${YELLOW}Test 1: Login Rate Limit (5 requests per minute)${NC}"
echo "=================================================="
echo ""

SUCCESS_COUNT=0
THROTTLED_COUNT=0

for i in {1..7}; do
  echo -n "Request #$i: "
  
  RESPONSE=$(curl -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' \
    -w "\n%{http_code}" \
    -s)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo -e "${RED}HTTP $HTTP_CODE - Rate Limited${NC}"
    echo "   Response: $BODY"
    THROTTLED_COUNT=$((THROTTLED_COUNT + 1))
  elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}HTTP $HTTP_CODE - Unauthorized (Expected)${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${YELLOW}HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
  fi
  
  # Small delay between requests
  if [ $i -lt 7 ]; then
    sleep 0.3
  fi
done

echo ""
echo "Results:"
echo "  - Successful requests (401): $SUCCESS_COUNT"
echo "  - Rate limited (429): $THROTTLED_COUNT"
echo ""

if [ $SUCCESS_COUNT -eq 5 ] && [ $THROTTLED_COUNT -eq 2 ]; then
  echo -e "${GREEN}✅ Test 1 PASSED: Login rate limiting works correctly${NC}"
else
  echo -e "${RED}❌ Test 1 FAILED: Expected 5 successful + 2 throttled${NC}"
fi

echo ""
echo "=========================================="
echo ""

# Test 2: Check error format
echo -e "${YELLOW}Test 2: Verify Error Format${NC}"
echo "==========================="
echo ""

# Make enough requests to trigger rate limit
for i in {1..6}; do
  curl -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -s -o /dev/null
  sleep 0.2
done

# This should be rate limited
echo "Making rate-limited request..."
ERROR_RESPONSE=$(curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -s)

echo "Response: $ERROR_RESPONSE"
echo ""

# Check if response contains expected fields
if echo "$ERROR_RESPONSE" | grep -q "TOO_MANY_REQUESTS" && \
   echo "$ERROR_RESPONSE" | grep -q "Rate limit exceeded"; then
  echo -e "${GREEN}✅ Test 2 PASSED: Error format is correct${NC}"
else
  echo -e "${RED}❌ Test 2 FAILED: Error format does not match expected format${NC}"
fi

echo ""
echo "=========================================="
echo ""
echo "Note: Wait 60 seconds before running this script again"
echo "      to allow rate limit counters to reset."
echo ""
echo "=========================================="

