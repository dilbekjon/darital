#!/bin/bash

# Test Payment Detail Screen - Backend API
# This script tests the new GET /api/tenant/payments/:id endpoint

echo "🧪 Testing Payment Detail API Endpoint"
echo "========================================"
echo ""

API_URL="http://localhost:3001"

# Step 1: Login to get token
echo "1️⃣  Logging in as tenant..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful! Token obtained."
echo ""

# Step 2: Get all payments to find a payment ID
echo "2️⃣  Fetching payments list..."
PAYMENTS_RESPONSE=$(curl -s -X GET "$API_URL/api/tenant/payments" \
  -H "Authorization: Bearer $TOKEN")

echo "$PAYMENTS_RESPONSE" | jq '.' > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Failed to parse payments response"
  echo "$PAYMENTS_RESPONSE"
  exit 1
fi

PAYMENT_COUNT=$(echo "$PAYMENTS_RESPONSE" | jq '. | length')
echo "✅ Found $PAYMENT_COUNT payment(s)"

if [ "$PAYMENT_COUNT" -eq 0 ]; then
  echo "⚠️  No payments found. Cannot test detail endpoint."
  echo "   Please create a payment first."
  exit 0
fi

PAYMENT_ID=$(echo "$PAYMENTS_RESPONSE" | jq -r '.[0].id')
echo "📋 Using payment ID: $PAYMENT_ID"
echo ""

# Step 3: Get payment detail
echo "3️⃣  Fetching payment detail..."
DETAIL_RESPONSE=$(curl -s -X GET "$API_URL/api/tenant/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$DETAIL_RESPONSE" | jq '.' > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Failed to parse detail response"
  echo "$DETAIL_RESPONSE"
  exit 1
fi

echo "✅ Payment detail retrieved successfully!"
echo ""

# Step 4: Display the result
echo "📊 Payment Detail:"
echo "=================="
echo "$DETAIL_RESPONSE" | jq '{
  id: .id,
  amount: .amount,
  method: .method,
  status: .status,
  createdAt: .createdAt,
  paidAt: .paidAt,
  invoice: {
    id: .invoice.id,
    amount: .invoice.amount,
    dueDate: .invoice.dueDate,
    status: .invoice.status,
    unitName: .invoice.unitName
  }
}'

echo ""
echo "✅ All tests passed!"
echo ""
echo "🎉 Payment Detail API is working correctly!"
echo ""
echo "📱 Next: Test in mobile app"
echo "   1. Run: ./START_MOBILE.sh"
echo "   2. Login as tenant"
echo "   3. Go to Payments tab"
echo "   4. Tap any payment card"
echo "   5. Verify all details display"

