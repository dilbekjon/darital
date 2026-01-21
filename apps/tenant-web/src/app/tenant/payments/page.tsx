'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantPayments, refreshTenantPayment } from '../../../lib/tenantApi';
import { ApiError, fetchTenantApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';
import ReceiptDownload from '../../../components/ReceiptDownload';

const PaymentsPage = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingPaymentId, setRefreshingPaymentId] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  const handleDownloadReceipt = async (paymentId: string) => {
    setLoadingReceipt(paymentId);
    try {
      const data = await fetchTenantApi(`/tenant/receipts/payment/${paymentId}`);
      setReceiptData(data);
    } catch (err) {
      console.error('Failed to load receipt:', err);
      alert(t.receiptError || 'Failed to load receipt');
    } finally {
      setLoadingReceipt(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // If user just paid, refresh that payment once on return
        const lastPaymentId = typeof window !== 'undefined'
          ? localStorage.getItem('lastPaymentId')
          : null;
        if (lastPaymentId) {
          try {
            await refreshTenantPayment(lastPaymentId);
          } catch (refreshErr) {
            console.warn('Failed to refresh last payment:', refreshErr);
          } finally {
            localStorage.removeItem('lastPaymentId');
            localStorage.removeItem('lastPaymentInvoiceId');
          }
        }
        const paymentData = await getTenantPayments();
        setPayments(paymentData);
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  // Auto-refresh pending CheckoutUz payments every 30 seconds
  useEffect(() => {
    const refreshPendingPayments = async () => {
      const currentPayments = await getTenantPayments();
      const pendingPayments = currentPayments.filter(p => p.status === 'PENDING' && p.provider === 'UZUM');
      
      if (pendingPayments.length === 0) {
        setPayments(currentPayments);
        return false; // No pending payments
      }

      try {
        // Refresh all pending UZUM payments
        for (const payment of pendingPayments) {
          await refreshTenantPayment(payment.id);
        }
        // Reload payment list
        const updatedPayments = await getTenantPayments();
        setPayments(updatedPayments);
        return true; // Had pending payments
      } catch (err) {
        console.error('Auto-refresh error:', err);
        return false;
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(refreshPendingPayments, 30000);

    return () => clearInterval(intervalId);
  }, []); // Run once on mount

  // Auto-refresh when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const currentPayments = await getTenantPayments();
        const pendingPayments = currentPayments.filter(p => p.status === 'PENDING' && p.provider === 'UZUM');
        
        if (pendingPayments.length > 0) {
          try {
            for (const payment of pendingPayments) {
              await refreshTenantPayment(payment.id);
            }
            const updatedPayments = await getTenantPayments();
            setPayments(updatedPayments);
          } catch (err) {
            console.error('Auto-refresh on visibility change error:', err);
          }
        } else {
          setPayments(currentPayments);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Sort payments by importance: PENDING first, then by date
  // Must be called before any early returns to maintain hooks order
  const sortedPayments = useMemo(() => {
    const statusPriority: Record<string, number> = { PENDING: 0, CANCELLED: 1, CONFIRMED: 2 };
    return [...payments].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Within same status, most recent first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [payments]);

  const handleRefreshPayment = async (paymentId: string) => {
    setRefreshError(null);
    setRefreshingPaymentId(paymentId);
    try {
      await refreshTenantPayment(paymentId);
      const paymentData = await getTenantPayments();
      setPayments(paymentData);
    } catch (err) {
      console.error(err);
      setRefreshError(t.paymentFailed || 'Unable to refresh payment status.');
    } finally {
      setRefreshingPaymentId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return darkMode ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-green-100 text-green-700 border-green-300';
      case 'PENDING':
        return darkMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return darkMode ? 'bg-gray-500/20 text-gray-400 border-gray-500/50' : 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return t.confirmed;
      case 'PENDING':
        return t.pending;
      default:
        return status;
    }
  };

  const isPaymentReceived = (payment: any): boolean => {
    if (payment.status === 'CONFIRMED') return true;
    if (payment.method === 'OFFLINE') {
      return !!payment.providerPaymentId;
    }
    const rawPayload = payment.rawPayload;
    if (!rawPayload) return false;
    if (rawPayload.checkoutUz?.payment?.status === 'paid' || rawPayload.webhook) {
      return true;
    }
    if (rawPayload.status === 'paid' || rawPayload.status === 'success' || rawPayload.paidAt) {
      return true;
    }
    return false;
  };

  if (loading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  return (
    <>
      <TenantNavbar />
      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${
            darkMode
              ? 'text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]'
              : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
          }`}
          style={darkMode ? {
            textShadow: '0 0 20px rgba(234, 179, 8, 0.3)',
            WebkitTextStroke: '1px rgba(234, 179, 8, 0.3)'
          } : {}}>
            {darkMode && <span className="text-yellow-400">💳 </span>}
            {t.paymentsHistory}
          </h1>
          <a 
            href="/tenant" 
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.home}
          </a>
        </div>

        {/* Payments Grid */}
        {refreshError && (
          <div className={`mb-4 border px-4 py-3 rounded-lg ${
            darkMode
              ? 'bg-red-900/20 border-red-700 text-red-200'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {refreshError}
          </div>
        )}
        {sortedPayments.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${
            darkMode 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/40 text-gray-400' 
              : 'bg-white border-gray-200 text-gray-600'
          }`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg">{t.noPayments}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedPayments.map((payment) => {
              const received = isPaymentReceived(payment);
              const isConfirmed = payment.status === 'CONFIRMED';
              const isPending = payment.status === 'PENDING';
              
              return (
                <div
                  key={payment.id}
                  className={`group rounded-2xl shadow-xl overflow-hidden transition-all duration-300 border-2 hover:-translate-y-1 ${
                    isConfirmed
                      ? darkMode
                        ? 'bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-green-500/50 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                        : 'bg-gradient-to-br from-green-50 via-white to-green-50 border-green-300 hover:border-green-400 hover:shadow-2xl'
                      : isPending && received
                      ? darkMode
                        ? 'bg-gradient-to-br from-yellow-900/20 via-gray-900 to-black border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                        : 'bg-gradient-to-br from-yellow-50 via-white to-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-2xl'
                      : darkMode
                        ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-gray-600 hover:border-gray-500 hover:shadow-[0_0_30px_rgba(107,114,128,0.3)]'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-2xl'
                  }`}
                >
                  {/* Status Banner */}
                  {isConfirmed && (
                    <div className={`px-6 py-3 ${darkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-green-500' : 'bg-green-500'}`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                            {t.confirmed || 'Payment Confirmed'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-green-400/70' : 'text-green-600'}`}>
                            {darkMode ? "To'lov tasdiqlandi va yakunlandi" : 'Payment has been verified and completed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isPending && received && (
                    <div className={`px-6 py-3 ${darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-yellow-500' : 'bg-yellow-500'}`}>
                          <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                            {darkMode ? "To'lov Qabul Qilindi - Tekshirilmoqda" : 'Payment Received - Under Review'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-yellow-400/70' : 'text-yellow-600'}`}>
                            {darkMode ? "Administrator tekshiruvini kutmoqda" : 'Awaiting administrator verification'}
                          </p>
                        </div>
                        {/* Animated Progress Indicator */}
                        <div className="hidden sm:flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-yellow-400' : 'bg-yellow-500'}`}></div>
                          <div className={`w-8 h-1 rounded ${darkMode ? 'bg-yellow-400/50' : 'bg-yellow-300'}`}>
                            <div className={`h-full rounded ${darkMode ? 'bg-yellow-400' : 'bg-yellow-500'} animate-pulse`} style={{width: '60%'}}></div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-yellow-400/30' : 'bg-yellow-200'}`}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Main Content Row */}
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      {/* Unit & Payment Info */}
                      <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-2xl ${
                          isConfirmed
                            ? darkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-200'
                            : isPending && received
                            ? darkMode ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-100 border border-yellow-200'
                            : darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'
                        }`}>
                          <svg className={`w-8 h-8 ${
                            isConfirmed
                              ? darkMode ? 'text-green-400' : 'text-green-600'
                              : isPending && received
                              ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                              : darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          {payment.unitName && (
                            <p className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {payment.unitName}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                              payment.method === 'ONLINE'
                                ? darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                : darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {payment.method === 'ONLINE' ? '🌐 Online' : '💵 Offline'}
                            </span>
                            {payment.provider && payment.provider !== 'NONE' && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                                darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {payment.provider}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            ID: {payment.id.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-center sm:text-right">
                        <p className={`text-xs uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t.amount}</p>
                        <p className={`text-3xl font-bold ${
                          isConfirmed
                            ? darkMode ? 'text-green-400' : 'text-green-600'
                            : isPending && received
                            ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                            : darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {payment.amount.toLocaleString()}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>UZS</p>
                      </div>

                      {/* Date */}
                      <div className="text-center sm:text-right">
                        <p className={`text-xs uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {payment.paidAt ? (t.paidAt || 'Paid') : (t.createdAt || 'Created')}
                        </p>
                        <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('uz-UZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {new Date(payment.paidAt || payment.createdAt).toLocaleTimeString('uz-UZ', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Progress Steps for Pending Received Payments */}
                    {isPending && received && (
                      <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          {/* Step 1: Payment Made */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-green-500' : 'bg-green-500'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className={`mt-2 text-xs font-medium text-center ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {darkMode ? "To'lov yuborildi" : 'Payment Sent'}
                            </p>
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 rounded ${darkMode ? 'bg-green-500' : 'bg-green-400'}`}></div>
                          
                          {/* Step 2: Received */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-green-500' : 'bg-green-500'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className={`mt-2 text-xs font-medium text-center ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {darkMode ? 'Qabul qilindi' : 'Received'}
                            </p>
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 rounded overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className={`h-full ${darkMode ? 'bg-yellow-500' : 'bg-yellow-400'} animate-pulse`} style={{width: '50%'}}></div>
                          </div>
                          
                          {/* Step 3: Under Review */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                              darkMode ? 'border-yellow-500 bg-yellow-500/20' : 'border-yellow-500 bg-yellow-100'
                            }`}>
                              <svg className={`w-5 h-5 animate-spin ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                            <p className={`mt-2 text-xs font-medium text-center ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                              {darkMode ? 'Tekshirilmoqda' : 'Under Review'}
                            </p>
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                          
                          {/* Step 4: Confirmed */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                              darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'
                            }`}>
                              <svg className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className={`mt-2 text-xs font-medium text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {darkMode ? 'Tasdiqlandi' : 'Confirmed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer with Invoice Reference and Actions */}
                    <div className={`mt-6 pt-4 border-t flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {t.invoiceId || 'Invoice'}: <span className="font-mono">{payment.invoiceId.slice(0, 12)}...</span>
                      </p>
                      <div className="flex items-center gap-2">
                        {/* Download Receipt Button - only for confirmed payments */}
                        {isConfirmed && (
                          <button
                            onClick={() => handleDownloadReceipt(payment.id)}
                            disabled={loadingReceipt === payment.id}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              darkMode
                                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-50'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50'
                            }`}
                          >
                            {loadingReceipt === payment.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            {t.receipt || 'Receipt'}
                          </button>
                        )}
                        {/* Refresh Button - for pending UZUM payments */}
                        {isPending && payment.provider === 'UZUM' && (
                          <button
                            onClick={() => handleRefreshPayment(payment.id)}
                            disabled={refreshingPaymentId === payment.id}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                            }`}
                          >
                            <svg className={`w-4 h-4 ${refreshingPaymentId === payment.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {refreshingPaymentId === payment.id ? (t.loading || 'Loading...') : (t.refresh || 'Refresh')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptDownload
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </>
  );
};

export default PaymentsPage;
