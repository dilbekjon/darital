'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useUntypedTranslations } from '../../i18n/useUntypedTranslations';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { fetchApi, ApiError, normalizeListResponse } from '../../lib/api';
import DaritalLoader from '../../components/DaritalLoader';
import SystemStatus from '../../components/SystemStatus';

interface DashboardStats {
  tenants: number;
  contracts: number;
  activeContracts: number;
  payments: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  invoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  expiringContracts: number;
}

interface CollectorSummaryItem {
  invoiceId: string;
  dueDate: string;
  tenantName: string;
  tenantPhone: string;
  unitName: string | null;
  cashTarget: number;
  cashCollected: number;
  remaining: number;
  status: 'COLLECTED' | 'PARTIAL' | 'PENDING';
}

interface CollectorSummary {
  month: string;
  totals: {
    requiredCount: number;
    collectedCount: number;
    remainingCount: number;
    requiredAmount: number;
    collectedAmount: number;
    remainingAmount: number;
    myCollectedAmount: number;
    myCollectedInvoiceCount: number;
  };
  items: {
    shouldCollect: CollectorSummaryItem[];
    collected: CollectorSummaryItem[];
    remaining: CollectorSummaryItem[];
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [collectorSummary, setCollectorSummary] = useState<CollectorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role-based visibility checks
  const canViewTenants = hasPermission('tenants.read');
  const canViewContracts = hasPermission('contracts.read');
  const canViewPayments = hasPermission('payments.read');
  const canViewReports = hasPermission('reports.view');
  const canViewChat = hasPermission('chat.read');
  const canManageNotifications = hasPermission('notifications.manage');
  const isPaymentCollector = user?.role === 'PAYMENT_COLLECTOR';

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Load dashboard statistics
  useEffect(() => {
    if (!authLoading && user) {
      loadStats();
    }
  }, [authLoading, user]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch data from multiple endpoints
      const [tenantsRes, contractsRes, paymentsRes, invoicesRes] = await Promise.all([
        fetchApi<any>('/tenants').catch(() => []),
        fetchApi<any>('/contracts').catch(() => []),
        fetchApi<any>('/payments').catch(() => []),
        fetchApi<any>('/invoices').catch(() => []),
      ]);

      const tenants = normalizeListResponse<any>(tenantsRes).items || [];
      const contracts = normalizeListResponse<any>(contractsRes).items || [];
      const payments = normalizeListResponse<any>(paymentsRes).items || [];
      const invoices = normalizeListResponse<any>(invoicesRes).items || [];

      // Calculate statistics
      const confirmedPayments = payments.filter((p: any) => p.status === 'CONFIRMED');
      const totalRevenue = confirmedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const pendingPayments = payments.filter((p: any) => p.status === 'PENDING');
      const pendingPaymentsAmount = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const activeContracts = contracts.filter((c: any) => c.status === 'ACTIVE').length;
      const pendingInvoices = invoices.filter((i: any) => i.status === 'PENDING').length;
      const overdueInvoices = invoices.filter((i: any) => i.status === 'OVERDUE').length;
      
      // Contracts expiring in next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringContracts = contracts.filter((c: any) => {
        if (c.status !== 'ACTIVE') return false;
        const endDate = new Date(c.endDate);
        return endDate <= thirtyDaysFromNow && endDate >= new Date();
      }).length;

      setStats({
        tenants: tenants.length,
        contracts: contracts.length,
        activeContracts,
        payments: payments.length,
        totalRevenue,
        pendingPayments: pendingPaymentsAmount,
        pendingPaymentsCount: pendingPayments.length,
        invoices: invoices.length,
        pendingInvoices,
        overdueInvoices,
        expiringContracts,
      });

      if (user?.role === 'PAYMENT_COLLECTOR') {
        const collectorRes = await fetchApi<CollectorSummary>('/payments/collector-summary').catch(() => null);
        setCollectorSummary(collectorRes);
      } else {
        setCollectorSummary(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t.failedToLoadDashboard);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user) {
    return null;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode
        ? 'bg-black'
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`rounded-2xl p-8 shadow-2xl border-2 mb-8 ${
          darkMode
            ? 'bg-black border-blue-600/40'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold mb-2 ${
                darkMode
                  ? 'text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                  : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
              }`}
              style={darkMode ? {
                textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                WebkitTextStroke: '1px rgba(59, 130, 246, 0.3)'
              } : {}}>
                {darkMode && '👋 '}
                {t.welcomeBack}, {user?.fullName}!
              </h1>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {user?.email} • <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${
                  darkMode 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>{user?.role}</span>
              </p>
            </div>
            {/* Logout button moved to GlobalHeader */}
          </div>
        </div>

        {/* System Status Indicator */}
        <div className="flex justify-center mb-6">
          <SystemStatus />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            {error}
          </div>
        )}

        {/* KPI Cards - Top Row (Role-based) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {canViewTenants && (
            <div 
              onClick={() => router.push('/admin/tenants')}
              className={`group rounded-xl p-6 shadow-md transition-all duration-200 border hover:shadow-lg cursor-pointer ${
                darkMode
                  ? 'bg-black border-blue-600/30 hover:border-blue-500'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.tenants}</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats?.tenants || 0}</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2.586a1 1 0 00-.707.293L12 7.707l-2.707-2.707A1 1 0 008.586 5H7a2 2 0 00-2 2v11a2 2 0 002 2h2m4 0h2a2 2 0 002-2v-7a2 2 0 00-2-2h-2m-4 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-4 0a5 5 0 0110 0v2a5 5 0 01-10 0V7a2 2 0 00-2-2H3a2 2 0 00-2 2v11a2 2 0 002 2h2" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {canViewContracts && (
            <div 
              onClick={() => router.push('/admin/contracts?status=ACTIVE')}
              className={`group rounded-xl p-6 shadow-md transition-all duration-200 border hover:shadow-lg cursor-pointer ${
                darkMode
                  ? 'bg-black border-blue-600/30 hover:border-green-500'
                  : 'bg-white border-gray-200 hover:border-green-300'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.activeContracts}</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats?.activeContracts || 0}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>jami {stats?.contracts || 0} ta</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {canViewPayments && (
            <>
              <div 
                onClick={() => router.push('/admin/payments')}
                className={`group rounded-xl p-6 shadow-md transition-all duration-200 border hover:shadow-lg cursor-pointer ${
                  darkMode
                    ? 'bg-black border-blue-600/30 hover:border-green-500'
                    : 'bg-white border-gray-200 hover:border-green-300'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.monthlyRevenue}</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats?.totalRevenue || 0)}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Barcha davr uchun</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-green-500/20' : 'bg-green-100'
                  }`}>
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => router.push('/admin/payments?status=PENDING')}
                className={`group rounded-xl p-6 shadow-md transition-all duration-200 border hover:shadow-lg cursor-pointer ${
                  darkMode
                    ? 'bg-black border-blue-600/30 hover:border-blue-500'
                    : 'bg-white border-gray-200 hover:border-yellow-300'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.pendingPayments}</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats?.pendingPaymentsCount || 0}</p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats?.pendingPayments || 0)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
                  }`}>
                    <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {isPaymentCollector && collectorSummary && (
          <div className={`rounded-xl p-6 shadow-md border mb-8 ${
            darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                To‘lov yig‘uvchi nazorati ({collectorSummary.month})
              </h2>
              <button
                onClick={() => router.push('/admin/payments')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  darkMode
                    ? 'border-blue-600/40 text-blue-300 hover:bg-blue-500/10'
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                }`}
              >
                To‘lovlar sahifasi
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`rounded-lg border p-4 ${darkMode ? 'border-blue-600/30 bg-blue-500/5' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Olishi kerak</p>
                <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{collectorSummary.totals.requiredCount}</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{formatCurrency(collectorSummary.totals.requiredAmount)}</p>
              </div>
              <div className={`rounded-lg border p-4 ${darkMode ? 'border-green-600/30 bg-green-500/5' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Olingan</p>
                <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{collectorSummary.totals.collectedCount}</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{formatCurrency(collectorSummary.totals.collectedAmount)}</p>
              </div>
              <div className={`rounded-lg border p-4 ${darkMode ? 'border-yellow-600/30 bg-yellow-500/5' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Qolgan</p>
                <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>{collectorSummary.totals.remainingCount}</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>{formatCurrency(collectorSummary.totals.remainingAmount)}</p>
              </div>
            </div>

            <div className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Siz yozgan to‘lovlar: <span className="font-semibold">{collectorSummary.totals.myCollectedInvoiceCount} ta invoice</span> • {formatCurrency(collectorSummary.totals.myCollectedAmount)}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={`${darkMode ? 'text-gray-400 border-b border-blue-600/20' : 'text-gray-600 border-b border-gray-200'}`}>
                    <th className="py-2 pr-3 text-left">Mijoz</th>
                    <th className="py-2 pr-3 text-left">Obyekt</th>
                    <th className="py-2 pr-3 text-left">Muddat</th>
                    <th className="py-2 pr-3 text-right">Kerak</th>
                    <th className="py-2 pr-3 text-right">Olingan</th>
                    <th className="py-2 pr-3 text-right">Qolgan</th>
                  </tr>
                </thead>
                <tbody>
                  {collectorSummary.items.remaining.slice(0, 12).map((item) => (
                    <tr key={item.invoiceId} className={`${darkMode ? 'border-b border-blue-600/10 text-gray-200' : 'border-b border-gray-100 text-gray-800'}`}>
                      <td className="py-2 pr-3">{item.tenantName} <span className={`${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>({item.tenantPhone})</span></td>
                      <td className="py-2 pr-3">{item.unitName || '—'}</td>
                      <td className="py-2 pr-3">{new Date(item.dueDate).toLocaleDateString('en-GB')}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(item.cashTarget)}</td>
                      <td className="py-2 pr-3 text-right">{formatCurrency(item.cashCollected)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{formatCurrency(item.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {collectorSummary.items.remaining.length === 0 && (
                <p className={`py-4 text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  Ajoyib — shu oy uchun naqd yig‘imda qolgan invoice yo‘q.
                </p>
              )}
            </div>
          </div>
        )}

        {/* What Needs Your Attention + Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Alerts Section */}
          <div className={`rounded-xl p-6 shadow-md border ${
            darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t.whatNeedsAttention}
            </h2>
            <div className="space-y-3">
              {stats && stats.overdueInvoices > 0 && (
                <div 
                  onClick={() => router.push('/admin/payments?status=OVERDUE')}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-red-900/20 border-red-800 hover:bg-red-900/30' 
                      : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                        {stats.overdueInvoices} {t.overdueInvoices}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {t.requiresImmediateAction}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
              
              {stats && stats.pendingPaymentsCount > 0 && (
                <div 
                  onClick={() => router.push('/admin/payments?status=PENDING')}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-blue-900/20 border-blue-800 hover:bg-blue-900/30' 
                      : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-yellow-800'}`}>
                        {stats.pendingPaymentsCount} {t.pendingPayments}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-yellow-600'}`}>
                        {t.awaitingConfirmation}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 ${darkMode ? 'text-blue-500' : 'text-yellow-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
              
              {stats && stats.expiringContracts > 0 && (
                <div 
                  onClick={() => router.push('/admin/contracts')}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-blue-900/20 border-blue-800 hover:bg-blue-900/30' 
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                        {stats.expiringContracts} {t.contractsExpiringSoon}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {t.within30Days}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
              
              {stats && stats.overdueInvoices === 0 && stats.pendingPaymentsCount === 0 && stats.expiringContracts === 0 && (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">{t.allCaughtUp}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions (Role-based) */}
          <div className={`rounded-xl p-6 shadow-md border ${
            darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t.quickActions}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {canViewContracts && (
                <button
                  onClick={() => router.push('/admin/contracts')}
                  className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-black border-blue-600/30 hover:border-blue-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t.createContract}
                    </span>
                  </div>
                </button>
              )}
              
              {canViewTenants && (
                <button
                  onClick={() => router.push('/admin/tenants')}
                  className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-black border-blue-600/30 hover:border-blue-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t.addTenant}
                    </span>
                  </div>
                </button>
              )}
              
              {canViewPayments && (
                <button
                  onClick={() => router.push('/admin/payments')}
                  className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-black border-blue-600/30 hover:border-blue-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t.recordPayment}
                    </span>
                  </div>
                </button>
              )}
              
              {canViewChat && (
                <button
                  onClick={() => router.push('/admin/chat')}
                  className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all ${
                    darkMode 
                      ? 'bg-black border-blue-600/30 hover:border-blue-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t.openSupportChat}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
