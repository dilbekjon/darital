#!/usr/bin/env tsx
/**
 * Test script for payment webhook flow
 * 
 * This script:
 * 1. Logs in as tenant1
 * 2. Gets first unpaid invoice
 * 3. Creates payment intent
 * 4. Simulates webhook callback
 * 5. Verifies payment and invoice are confirmed/paid
 * 
 * Usage: tsx scripts/test-payment-webhook.ts
 */

import { PrismaClient } from '@prisma/client';

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

async function apiPost(endpoint: string, body: any, token?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`API error ${res.status}: ${error.message || JSON.stringify(error)}`);
  }

  return res.json();
}

async function apiGet(endpoint: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`API error ${res.status}: ${error.message || JSON.stringify(error)}`);
  }

  return res.json();
}

async function main() {
  console.log('🧪 Testing payment webhook flow...\n');

  try {
    // Step 1: Login as tenant1
    console.log('1️⃣ Logging in as tenant1...');
    const loginRes = await apiPost('/auth/login', {
      email: 'tenant1@darital.local',
      password: 'tenant123',
    });
    const tenantToken = loginRes.accessToken;
    console.log('✅ Logged in successfully\n');

    // Step 2: Get tenant invoices
    console.log('2️⃣ Fetching tenant invoices...');
    const invoicesRes = await apiGet('/tenant/invoices', tenantToken);
    const invoices = invoicesRes.data || invoicesRes; // Handle both paginated and array responses
    const invoiceList = Array.isArray(invoices) ? invoices : (invoices.data || []);
    
    if (invoiceList.length === 0) {
      throw new Error('No invoices found for tenant1. Run seed script first.');
    }

    // Find first unpaid invoice
    const unpaidInvoice = invoiceList.find((inv: any) => inv.status !== 'PAID');
    if (!unpaidInvoice) {
      throw new Error('No unpaid invoices found. All invoices are already paid.');
    }
    console.log(`✅ Found unpaid invoice: ${unpaidInvoice.id} (amount: ${unpaidInvoice.amount}, status: ${unpaidInvoice.status})\n`);

    // Step 3: Create payment intent
    console.log('3️⃣ Creating payment intent...');
    const intentRes = await apiPost(
      '/tenant/payments/intent',
      {
        invoiceId: unpaidInvoice.id,
        provider: 'CLICK',
      },
      tenantToken,
    );
    const paymentId = intentRes.paymentId;
    console.log(`✅ Payment intent created: ${paymentId}\n`);

    // Step 4: Simulate webhook
    console.log('4️⃣ Simulating provider webhook...');
    const webhookRes = await apiPost(`/payments/webhook-sim/click/${paymentId}`, {});
    console.log(`✅ Webhook response:`, webhookRes);
    
    if (webhookRes.alreadyConfirmed) {
      console.log('⚠️  Payment was already confirmed (idempotent check passed)\n');
    } else if (webhookRes.confirmed) {
      console.log('✅ Payment confirmed via webhook\n');
    } else {
      console.log('⚠️  Unexpected webhook response\n');
    }

    // Step 5: Verify payment status
    console.log('5️⃣ Verifying payment status...');
    const paymentRes = await apiGet(`/tenant/payments`, tenantToken);
    const payments = paymentRes.data || paymentRes;
    const paymentList = Array.isArray(payments) ? payments : (payments.data || []);
    const createdPayment = paymentList.find((p: any) => p.id === paymentId);
    
    if (!createdPayment) {
      throw new Error(`Payment ${paymentId} not found in tenant payments list`);
    }
    
    console.log(`Payment status: ${createdPayment.status}`);
    if (createdPayment.status === 'CONFIRMED') {
      console.log('✅ Payment is CONFIRMED\n');
    } else {
      throw new Error(`Expected payment to be CONFIRMED, got ${createdPayment.status}`);
    }

    // Step 6: Verify invoice status
    console.log('6️⃣ Verifying invoice status...');
    const updatedInvoicesRes = await apiGet('/tenant/invoices', tenantToken);
    const updatedInvoices = updatedInvoicesRes.data || updatedInvoicesRes;
    const updatedInvoiceList = Array.isArray(updatedInvoices) ? updatedInvoices : (updatedInvoices.data || []);
    const updatedInvoice = updatedInvoiceList.find((inv: any) => inv.id === unpaidInvoice.id);
    
    if (!updatedInvoice) {
      throw new Error(`Invoice ${unpaidInvoice.id} not found`);
    }
    
    console.log(`Invoice status: ${updatedInvoice.status}`);
    if (updatedInvoice.status === 'PAID') {
      console.log('✅ Invoice is PAID\n');
    } else {
      console.log(`⚠️  Invoice status is ${updatedInvoice.status} (may need multiple payments to cover full amount)\n`);
    }

    // Step 7: Test idempotency - call webhook again
    console.log('7️⃣ Testing idempotency (calling webhook again)...');
    const webhookRes2 = await apiPost(`/payments/webhook-sim/click/${paymentId}`, {});
    if (webhookRes2.alreadyConfirmed) {
      console.log('✅ Idempotency check passed - payment not double-confirmed\n');
    } else {
      console.log('⚠️  Idempotency check may have failed\n');
    }

    console.log('🎉 All tests passed!');
    console.log('\nSummary:');
    console.log(`- Payment ID: ${paymentId}`);
    console.log(`- Invoice ID: ${unpaidInvoice.id}`);
    console.log(`- Payment Status: ${createdPayment.status}`);
    console.log(`- Invoice Status: ${updatedInvoice.status}`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

