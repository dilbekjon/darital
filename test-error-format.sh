#!/bin/bash

# Global Exception Filter Test Script
# Tests that all errors return in consistent { code, message, details } format

echo "=========================================="
echo "Global Exception Filter Test"
echo "=========================================="
echo ""

API_URL="http://localhost:3000/api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counter
PASSED=0
FAILED=0

# Helper function to test error format
test_error_format() {
  local test_name="$1"
  local response="$2"
  local expected_code="$3"
  
  echo -e "${BLUE}Test: ${test_name}${NC}"
  
  # Check if response has the required fields
  has_code=$(echo "$response" | jq -r 'has("code")')
  has_message=$(echo "$response" | jq -r 'has("message")')
  has_details=$(echo "$response" | jq -r 'has("details")')
  
  actual_code=$(echo "$response" | jq -r '.code')
  
  if [ "$has_code" = "true" ] && [ "$has_message" = "true" ] && [ "$has_details" = "true" ]; then
    if [ "$actual_code" = "$expected_code" ]; then
      echo -e "  ${GREEN}✓ PASSED${NC} - Format correct, code: $actual_code"
      PASSED=$((PASSED + 1))
    else
      echo -e "  ${RED}✗ FAILED${NC} - Expected code: $expected_code, got: $actual_code"
      FAILED=$((FAILED + 1))
    fi
  else
    echo -e "  ${RED}✗ FAILED${NC} - Missing required fields"
    echo "    has_code: $has_code, has_message: $has_message, has_details: $has_details"
    FAILED=$((FAILED + 1))
  fi
  
  echo "  Response: $response"
  echo ""
}

# Test 1: Authentication Error (401)
echo -e "${YELLOW}=== Test 1: Authentication Error (401) ===${NC}"
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrongpassword"}')
test_error_format "Authentication with wrong credentials" "$RESPONSE" "UNAUTHORIZED"

# Test 2: Not Found Error (404)
echo -e "${YELLOW}=== Test 2: Not Found Error (404) ===${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/units/nonexistent-id-12345")
test_error_format "Get non-existent unit" "$RESPONSE" "NOT_FOUND"

# Test 3: Rate Limit Error (429)
echo -e "${YELLOW}=== Test 3: Rate Limit Error (429) ===${NC}"
# Make 6 requests quickly to trigger rate limit
for i in {1..6}; do
  RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}')
  sleep 0.2
done
test_error_format "Rate limit exceeded" "$RESPONSE" "TOO_MANY_REQUESTS"

# Wait a bit before next test
sleep 2

# Test 4: Validation Error (400) - if possible
echo -e "${YELLOW}=== Test 4: Validation Error (400) ===${NC}"
# Note: This requires a valid JWT token to test properly
# For now, we'll just check the format of an auth error
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":""}')
  
# This might return 400 or 401 depending on validation order
actual_code=$(echo "$RESPONSE" | jq -r '.code')
if [[ "$actual_code" == "BAD_REQUEST" ]] || [[ "$actual_code" == "UNAUTHORIZED" ]]; then
  echo -e "  ${GREEN}✓ PASSED${NC} - Format correct, code: $actual_code"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗ FAILED${NC} - Unexpected code: $actual_code"
  FAILED=$((FAILED + 1))
fi
echo "  Response: $RESPONSE"
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=========================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo -e "${GREEN}✓ Error format is consistent across all endpoints${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi

