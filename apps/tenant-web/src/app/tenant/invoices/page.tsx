'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createTenantPaymentIntent, getTenantInvoices } from '../../../lib/tenantApi';
import { ApiError } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';

const InvoicePage = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  // Helper to calculate days until/after due date
  const getDaysRemaining = (dueDate: string): { days: number; isOverdue: boolean; urgency: 'normal' | 'soon' | 'overdue' } => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), isOverdue: true, urgency: 'overdue' };
    } else if (diffDays <= 3) {
      return { days: diffDays, isOverdue: false, urgency: 'soon' };
    }
    return { days: diffDays, isOverdue: false, urgency: 'normal' };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const invoiceData = await getTenantInvoices();
        setInvoices(invoiceData);
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

  // Sort invoices by importance: OVERDUE > PENDING > PAID
  // Must be called before any early returns to maintain hooks order
  const sortedInvoices = useMemo(() => {
    const statusPriority: Record<string, number> = { OVERDUE: 0, PENDING: 1, PAID: 2 };
    return [...invoices].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Within same status, sort by due date (earlier first for unpaid)
      if (a.status === 'PAID') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [invoices]);

  const handlePayInvoice = async (invoiceId: string) => {
    setPaymentError(null);
    setPayingInvoiceId(invoiceId);
    try {
      // Use CLICK which now maps to Checkout.uz (UZUM) on the backend
      const intent = await createTenantPaymentIntent(invoiceId, 'CLICK');
      
      console.log('Payment intent response:', intent);
      
      if (intent.checkoutUrl) {
        // Store payment info to refresh status after redirect back
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastPaymentId', intent.paymentId);
          localStorage.setItem('lastPaymentInvoiceId', intent.invoiceId);
        }
        // Redirect immediately to checkout page
        window.location.href = intent.checkoutUrl;
        return;
      }
      
      // If no checkoutUrl, show error
      console.error('No checkoutUrl in response:', intent);
      setPaymentError(t.paymentFailed || 'Payment link is not available. Please try again.');
      setPayingInvoiceId(null);
    } catch (err: any) {
      console.error('Payment intent error:', err);
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : err?.message || t.paymentFailed || 'Unable to start payment. Please try again.';
      setPaymentError(errorMessage);
      setPayingInvoiceId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return darkMode ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-green-100 text-green-700 border-green-300';
      case 'PENDING':
        return darkMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'OVERDUE':
        return darkMode ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-red-100 text-red-700 border-red-300';
      default:
        return darkMode ? 'bg-gray-500/20 text-gray-400 border-gray-500/50' : 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return t.paid;
      case 'PENDING':
        return t.pending;
      case 'OVERDUE':
        return t.overdue;
      default:
        return status;
    }
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
            {darkMode && <span className="text-yellow-400">📄 </span>}
            {t.invoicesList}
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

        {/* Invoices Grid */}
        {paymentError && (
          <div className={`mb-4 border px-4 py-3 rounded-lg ${
            darkMode
              ? 'bg-red-900/20 border-red-700 text-red-200'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {paymentError}
          </div>
        )}
        {sortedInvoices.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${
            darkMode 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/40 text-gray-400' 
              : 'bg-white border-gray-200 text-gray-600'
          }`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">{t.noInvoices}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedInvoices.map((invoice) => {
              // Check if payment was made and is pending verification
              const hasPaymentPending = invoice.latestPayment && invoice.latestPayment.status === 'PENDING';
              const payment = invoice.latestPayment;
              const rawPayload = payment?.rawPayload;
              const isPaymentReceived = hasPaymentPending && (
                rawPayload?.webhook === true ||
                rawPayload?.checkoutUz?.payment?.status === 'paid' ||
                rawPayload?.status === 'paid' ||
                rawPayload?.status === 'success' ||
                (payment?.providerPaymentId && payment?.method === 'ONLINE')
              );
              const isPaid = invoice.status === 'PAID';
              const isOverdue = invoice.status === 'OVERDUE';
              
              return (
                <div
                  key={invoice.id}
                  className={`group rounded-2xl shadow-xl overflow-hidden transition-all duration-300 border-2 hover:-translate-y-1 ${
                    isPaid
                      ? darkMode
                        ? 'bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-green-500/50 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                        : 'bg-gradient-to-br from-green-50 via-white to-green-50 border-green-300 hover:border-green-400 hover:shadow-2xl'
                      : isPaymentReceived
                      ? darkMode
                        ? 'bg-gradient-to-br from-yellow-900/20 via-gray-900 to-black border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                        : 'bg-gradient-to-br from-yellow-50 via-white to-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-2xl'
                      : isOverdue
                      ? darkMode
                        ? 'bg-gradient-to-br from-red-900/20 via-gray-900 to-black border-red-500/50 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                        : 'bg-gradient-to-br from-red-50 via-white to-red-50 border-red-300 hover:border-red-400 hover:shadow-2xl'
                      : darkMode
                        ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-yellow-500/40 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-2xl'
                  }`}
                >
                  {/* Status Banner */}
                  {isPaid && (
                    <div className={`px-6 py-3 ${darkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-green-500' : 'bg-green-500'}`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                            {t.paid || 'Invoice Paid'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-green-400/70' : 'text-green-600'}`}>
                            {darkMode ? "Hisob-faktura to'liq to'landi" : 'This invoice has been fully paid'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isPaymentReceived && !isPaid && (
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

                  {isOverdue && !isPaymentReceived && (
                    <div className={`px-6 py-3 ${darkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-red-500' : 'bg-red-500'}`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                            {t.overdue || 'Payment Overdue'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-red-400/70' : 'text-red-600'}`}>
                            {darkMode ? "Iltimos, zudlik bilan to'lang" : 'Please pay immediately to avoid penalties'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Main Content */}
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      {/* Unit Info */}
                      <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-2xl ${
                          isPaid
                            ? darkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-200'
                            : isPaymentReceived
                            ? darkMode ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-100 border border-yellow-200'
                            : isOverdue
                            ? darkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-200'
                            : darkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-100 border border-blue-200'
                        }`}>
                          <svg className={`w-8 h-8 ${
                            isPaid
                              ? darkMode ? 'text-green-400' : 'text-green-600'
                              : isPaymentReceived
                              ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                              : isOverdue
                              ? darkMode ? 'text-red-400' : 'text-red-600'
                              : darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <div>
                          <p className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {invoice.unitName}
                          </p>
                          <p className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            ID: {invoice.id.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-center sm:text-right">
                        <p className={`text-xs uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t.amount}</p>
                        <p className={`text-3xl font-bold ${
                          isPaid
                            ? darkMode ? 'text-green-400' : 'text-green-600'
                            : isPaymentReceived
                            ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                            : isOverdue
                            ? darkMode ? 'text-red-400' : 'text-red-600'
                            : darkMode ? 'text-yellow-400' : 'text-blue-600'
                        }`}>
                          {invoice.amount.toLocaleString()}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>UZS</p>
                      </div>

                      {/* Due Date */}
                      <div className="text-center sm:text-right">
                        <p className={`text-xs uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {t.dueDate || 'Due Date'}
                        </p>
                        <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {new Date(invoice.dueDate).toLocaleDateString('uz-UZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        {!isPaid && (() => {
                          const { days, isOverdue: overdue, urgency } = getDaysRemaining(invoice.dueDate);
                          return (
                            <span className={`inline-flex items-center px-2 py-1 mt-1 rounded-lg text-xs font-bold ${
                              urgency === 'overdue'
                                ? darkMode ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-700'
                                : urgency === 'soon'
                                ? darkMode ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                                : darkMode ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {overdue
                                ? `${days}d overdue`
                                : `${days}d left`
                              }
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Progress Steps for Pending Payment Invoices */}
                    {isPaymentReceived && !isPaid && (
                      <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          {/* Step 1: Invoice Created */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-green-500' : 'bg-green-500'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className={`mt-2 text-xs font-medium text-center ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {darkMode ? 'Hisob-faktura' : 'Invoice'}
                            </p>
                          </div>
                          
                          {/* Line */}
                          <div className={`flex-1 h-1 mx-2 rounded ${darkMode ? 'bg-green-500' : 'bg-green-400'}`}></div>
                          
                          {/* Step 2: Payment Made */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-green-500' : 'bg-green-500'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className={`mt-2 text-xs font-medium text-center ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {darkMode ? "To'landi" : 'Paid'}
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
                              {darkMode ? 'Tekshiruv' : 'Review'}
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
                              {darkMode ? 'Yakunlandi' : 'Complete'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pay Now Button Section */}
                    {!isPaid && !isPaymentReceived && (
                      <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {isOverdue 
                                ? (t.payBefore || 'Please pay immediately')
                                : (t.paymentDue || 'Payment Due')
                              }
                            </p>
                            {(() => {
                              const { days, isOverdue: overdue } = getDaysRemaining(invoice.dueDate);
                              if (overdue) {
                                return (
                                  <p className={`text-sm font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                    {t.urgentPayment || 'Urgent: Payment is overdue!'}
                                  </p>
                                );
                              } else if (days <= 3) {
                                return (
                                  <p className={`text-sm font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                    {`Only ${days} days left to pay`}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <button
                            onClick={() => handlePayInvoice(invoice.id)}
                            disabled={payingInvoiceId === invoice.id}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                              isOverdue
                                ? darkMode
                                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/50'
                                  : 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30'
                                : darkMode
                                ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-yellow-500/50'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                            }`}
                          >
                            {payingInvoiceId === invoice.id ? (
                              <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t.loading || 'Loading...'}
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                {t.payNow || 'Pay Now'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Already Paid Message */}
                    {isPaymentReceived && !isPaid && (
                      <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-sm text-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {darkMode 
                            ? "To'lov allaqachon qabul qilindi. Tasdiqlashni kutmoqdasiz."
                            : 'Payment already received. Waiting for confirmation.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default InvoicePage;
