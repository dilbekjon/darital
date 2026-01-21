'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../../contexts/ThemeContext';
import { NoAccess } from '../../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { fetchApi, ApiError, normalizeListResponse } from '../../../../lib/api';

interface HealthCheck {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  timestamp?: string;
}

interface PaymentFlowResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  timestamp?: string;
}

export default function DevQAPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlowResult[]>([]);
  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [curlCommands, setCurlCommands] = useState<string[]>([]);

  // Check if we're in development mode
  useEffect(() => {
    setIsDev(process.env.NODE_ENV !== 'production');
    if (!loading) {
      if (!user || !hasPermission('payments.read')) {
        setPageLoading(false);
        return;
      }
      setPageLoading(false);
    }
  }, [loading, user, hasPermission]);

  const runHealthChecks = async () => {
    setHealthChecks([
      { endpoint: '/health', status: 'pending' },
      { endpoint: '/invoices?page=1&limit=5', status: 'pending' },
      { endpoint: '/payments?page=1&limit=5', status: 'pending' },
    ]);

    const checks: HealthCheck[] = [];

    // Check 1: Health endpoint
    try {
      const healthData = await fetchApi('/health');
      checks.push({
        endpoint: '/health',
        status: 'success',
        data: healthData,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      checks.push({
        endpoint: '/health',
        status: 'error',
        error: err instanceof ApiError ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }

    // Check 2: Invoices endpoint
    try {
      const invoicesData = await fetchApi('/invoices?page=1&limit=5');
      const normalized = normalizeListResponse(invoicesData);
      checks.push({
        endpoint: '/invoices?page=1&limit=5',
        status: 'success',
        data: {
          total: normalized.meta?.total || normalized.items.length,
          count: normalized.items.length,
          sample: normalized.items.slice(0, 2),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      checks.push({
        endpoint: '/invoices?page=1&limit=5',
        status: 'error',
        error: err instanceof ApiError ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }

    // Check 3: Payments endpoint
    try {
      const paymentsData = await fetchApi('/payments?page=1&limit=5');
      const normalized = normalizeListResponse(paymentsData);
      checks.push({
        endpoint: '/payments?page=1&limit=5',
        status: 'success',
        data: {
          total: normalized.meta?.total || normalized.items.length,
          count: normalized.items.length,
          sample: normalized.items.slice(0, 2),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      checks.push({
        endpoint: '/payments?page=1&limit=5',
        status: 'error',
        error: err instanceof ApiError ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }

    setHealthChecks(checks);
  };

  const runPaymentFlow = async () => {
    if (!isDev) {
      alert('Payment flow test is only available in development mode');
      return;
    }

    setIsRunningFlow(true);
    setPaymentFlow([]);
    setCurlCommands([]);

    const steps: PaymentFlowResult[] = [];
    const commands: string[] = [];
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const TENANT_EMAIL = 'tenant1@darital.local';
    const TENANT_PASSWORD = 'tenant123';

    try {
      // Step 1: Login as tenant1
      steps.push({ step: '1. Login as tenant1', status: 'pending' });
      setPaymentFlow([...steps]);

      let tenantToken: string;
      try {
        // Login endpoint is public, so we need to call it without admin token
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: TENANT_EMAIL, password: TENANT_PASSWORD }),
        });
        if (!loginResponse.ok) {
          const errorData = await loginResponse.json().catch(() => ({ message: 'Login failed' }));
          throw new Error(errorData.message || 'Login failed');
        }
        const loginRes = await loginResponse.json();
        tenantToken = loginRes.accessToken;
        steps[0] = {
          step: '1. Login as tenant1',
          status: 'success',
          data: { email: TENANT_EMAIL, tokenReceived: !!tenantToken },
          timestamp: new Date().toISOString(),
        };
        commands.push(`# Step 1: Login as tenant1\ncurl -X POST ${API_BASE}/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"${TENANT_EMAIL}","password":"${TENANT_PASSWORD}"}'`);
        setPaymentFlow([...steps]);
        setCurlCommands([...commands]);
      } catch (err: any) {
        steps[0] = {
          step: '1. Login as tenant1',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
        setIsRunningFlow(false);
        return;
      }

      // Step 2: Get tenant invoices
      steps.push({ step: '2. Get tenant invoices', status: 'pending' });
      setPaymentFlow([...steps]);

      let unpaidInvoice: any;
      try {
        // Use tenant token for tenant endpoints
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const invoicesResponse = await fetch(`${API_BASE}/tenant/invoices`, {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!invoicesResponse.ok) {
          const errorData = await invoicesResponse.json().catch(() => ({ message: 'Failed to fetch invoices' }));
          throw new Error(errorData.message || 'Failed to fetch invoices');
        }
        const invoicesRes = await invoicesResponse.json();
        const normalized = normalizeListResponse(invoicesRes);
        const invoices = normalized.items;
        unpaidInvoice = invoices.find((inv: any) => inv.status !== 'PAID');
        
        if (!unpaidInvoice) {
          throw new Error('No unpaid invoices found for tenant1');
        }

        steps[1] = {
          step: '2. Get tenant invoices',
          status: 'success',
          data: {
            totalInvoices: invoices.length,
            unpaidInvoiceId: unpaidInvoice.id,
            unpaidInvoiceAmount: unpaidInvoice.amount,
            unpaidInvoiceStatus: unpaidInvoice.status,
          },
          timestamp: new Date().toISOString(),
        };
        commands.push(`# Step 2: Get tenant invoices\ncurl -X GET ${API_BASE}/tenant/invoices \\\n  -H "Authorization: Bearer <token>"`);
        setPaymentFlow([...steps]);
        setCurlCommands([...commands]);
      } catch (err: any) {
        steps[1] = {
          step: '2. Get tenant invoices',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
        setIsRunningFlow(false);
        return;
      }

      // Step 3: Create payment intent
      steps.push({ step: '3. Create payment intent', status: 'pending' });
      setPaymentFlow([...steps]);

      let paymentId: string;
      try {
        // Use tenant token for tenant endpoints
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const intentResponse = await fetch(`${API_BASE}/tenant/payments/intent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoiceId: unpaidInvoice.id,
            provider: 'CLICK',
          }),
        });
        if (!intentResponse.ok) {
          const errorData = await intentResponse.json().catch(() => ({ message: 'Failed to create payment intent' }));
          throw new Error(errorData.message || 'Failed to create payment intent');
        }
        const intentRes = await intentResponse.json();
        paymentId = intentRes.paymentId;

        steps[2] = {
          step: '3. Create payment intent',
          status: 'success',
          data: {
            paymentId,
            invoiceId: intentRes.invoiceId,
            amount: intentRes.amount,
            provider: intentRes.provider,
          },
          timestamp: new Date().toISOString(),
        };
        commands.push(`# Step 3: Create payment intent\ncurl -X POST ${API_BASE}/tenant/payments/intent \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"invoiceId":"${unpaidInvoice.id}","provider":"CLICK"}'`);
        setPaymentFlow([...steps]);
        setCurlCommands([...commands]);
      } catch (err: any) {
        steps[2] = {
          step: '3. Create payment intent',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
        setIsRunningFlow(false);
        return;
      }

      // Step 4: Get payment before webhook
      steps.push({ step: '4. Get payment (before webhook)', status: 'pending' });
      setPaymentFlow([...steps]);

      let paymentBefore: any;
      try {
        paymentBefore = await fetchApi(`/payments?page=1&limit=100`);
        const normalized = normalizeListResponse(paymentBefore);
        paymentBefore = normalized.items.find((p: any) => p.id === paymentId);

        steps[3] = {
          step: '4. Get payment (before webhook)',
          status: 'success',
          data: {
            paymentId,
            status: paymentBefore?.status,
            amount: paymentBefore?.amount,
          },
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
      } catch (err: any) {
        steps[3] = {
          step: '4. Get payment (before webhook)',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
      }

      // Step 5: Simulate webhook
      steps.push({ step: '5. Simulate webhook', status: 'pending' });
      setPaymentFlow([...steps]);

      try {
        // Webhook-sim is public but dev-only
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const webhookResponse = await fetch(`${API_BASE}/payments/webhook-sim/click/${paymentId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!webhookResponse.ok) {
          const errorData = await webhookResponse.json().catch(() => ({ message: 'Webhook simulation failed' }));
          throw new Error(errorData.message || 'Webhook simulation failed');
        }
        const webhookRes = await webhookResponse.json();

        steps[4] = {
          step: '5. Simulate webhook',
          status: 'success',
          data: webhookRes,
          timestamp: new Date().toISOString(),
        };
        commands.push(`# Step 5: Simulate webhook\ncurl -X POST ${API_BASE}/payments/webhook-sim/click/${paymentId}`);
        setPaymentFlow([...steps]);
        setCurlCommands([...commands]);
      } catch (err: any) {
        steps[4] = {
          step: '5. Simulate webhook',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
        setIsRunningFlow(false);
        return;
      }

      // Step 6: Get payment after webhook
      steps.push({ step: '6. Get payment (after webhook)', status: 'pending' });
      setPaymentFlow([...steps]);

      try {
        const paymentAfterRes = await fetchApi(`/payments?page=1&limit=100`);
        const normalized = normalizeListResponse(paymentAfterRes);
        const paymentAfter = normalized.items.find((p: any) => p.id === paymentId) as any;

        steps[5] = {
          step: '6. Get payment (after webhook)',
          status: 'success',
          data: {
            paymentId,
            status: paymentAfter?.status,
            amount: paymentAfter?.amount,
            paidAt: paymentAfter?.paidAt,
          },
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
      } catch (err: any) {
        steps[5] = {
          step: '6. Get payment (after webhook)',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
      }

      // Step 7: Get invoice after webhook
      steps.push({ step: '7. Get invoice (after webhook)', status: 'pending' });
      setPaymentFlow([...steps]);

      try {
        const invoiceAfter = await fetchApi(`/invoices/${unpaidInvoice.id}`) as any;

        steps[6] = {
          step: '7. Get invoice (after webhook)',
          status: 'success',
          data: {
            invoiceId: invoiceAfter.id,
            status: invoiceAfter.status,
            amount: invoiceAfter.amount,
          },
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
      } catch (err: any) {
        steps[6] = {
          step: '7. Get invoice (after webhook)',
          status: 'error',
          error: err instanceof ApiError ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
        setPaymentFlow([...steps]);
      }

    } catch (err: any) {
      console.error('Payment flow error:', err);
    } finally {
      setIsRunningFlow(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading || pageLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !hasPermission('payments.read')) {
    return <NoAccess />;
  }

  if (!isDev) {
    return (
      <div className={`h-full overflow-y-auto p-4 sm:p-6 lg:p-8 ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
        <Breadcrumbs items={[{ label: 'Dev QA', href: '/admin/dev/qa' }]} />
        <div className="mt-6 p-6 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
          <h2 className="text-xl font-bold mb-2">⚠️ Development Only</h2>
          <p>This page is only available in development mode (NODE_ENV !== 'production').</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-4 sm:p-6 lg:p-8 ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Breadcrumbs items={[{ label: 'Dev QA', href: '/admin/dev/qa' }]} />

      <div className="mt-6">
        <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          🔧 Dev QA Tools
        </h1>
        <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Development-only tools for testing and verifying the payment flow end-to-end.
        </p>

        {/* Health Checks Section */}
        <div className={`mb-8 p-6 rounded-lg ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Health Checks
            </h2>
            <button
              onClick={runHealthChecks}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Run Health Checks
            </button>
          </div>

          {healthChecks.length > 0 && (
            <div className="space-y-4">
              {healthChecks.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    check.status === 'success'
                      ? darkMode
                        ? 'bg-green-900/20 border-green-600/50'
                        : 'bg-green-50 border-green-200'
                      : check.status === 'error'
                      ? darkMode
                        ? 'bg-red-900/20 border-red-600/50'
                        : 'bg-red-50 border-red-200'
                      : darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {check.endpoint}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        check.status === 'success'
                          ? 'bg-green-500 text-white'
                          : check.status === 'error'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                  {check.status === 'success' && check.data && (
                    <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(check.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {check.status === 'error' && check.error && (
                    <div className={`mt-2 text-sm text-red-600 ${darkMode ? 'text-red-400' : ''}`}>
                      {check.error}
                    </div>
                  )}
                  {check.timestamp && (
                    <div className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(check.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Flow Test Section */}
        <div className={`mb-8 p-6 rounded-lg ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Payment Flow Test
            </h2>
            <button
              onClick={runPaymentFlow}
              disabled={isRunningFlow}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunningFlow
                  ? 'bg-gray-400 cursor-not-allowed'
                  : darkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunningFlow ? 'Running...' : 'Run Payment Flow'}
            </button>
          </div>

          <p className={`mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            This will: login as tenant1 → find unpaid invoice → create payment intent → simulate webhook → verify status changes
          </p>

          {paymentFlow.length > 0 && (
            <div className="space-y-3 mb-6">
              {paymentFlow.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    step.status === 'success'
                      ? darkMode
                        ? 'bg-green-900/20 border-green-600/50'
                        : 'bg-green-50 border-green-200'
                      : step.status === 'error'
                      ? darkMode
                        ? 'bg-red-900/20 border-red-600/50'
                        : 'bg-red-50 border-red-200'
                      : darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {step.step}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        step.status === 'success'
                          ? 'bg-green-500 text-white'
                          : step.status === 'error'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {step.status.toUpperCase()}
                    </span>
                  </div>
                  {step.status === 'success' && step.data && (
                    <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(step.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {step.status === 'error' && step.error && (
                    <div className={`mt-2 text-sm text-red-600 ${darkMode ? 'text-red-400' : ''}`}>
                      {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {curlCommands.length > 0 && (
            <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Copyable cURL Commands
                </h3>
                <button
                  onClick={() => copyToClipboard(curlCommands.join('\n\n'))}
                  className={`px-3 py-1 text-sm rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                  Copy All
                </button>
              </div>
              <pre className={`mt-2 p-3 rounded text-xs overflow-x-auto ${darkMode ? 'bg-black text-gray-300' : 'bg-white text-gray-800'}`}>
                {curlCommands.map((cmd, idx) => (
                  <div key={idx} className="mb-2">
                    {cmd}
                    {idx < curlCommands.length - 1 && <div className="my-2 border-t border-gray-600"></div>}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

