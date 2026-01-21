'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantPayments } from '../../../lib/tenantApi';
import { ApiError } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
// Removed local Navbar; using global header

const PaymentsPage = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
          darkMode ? 'border-yellow-500' : 'border-blue-500'
        }`}></div>
      </div>
    );
  }

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

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Header provided globally by GlobalHeader */}
      
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
        {payments.length === 0 ? (
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
          <div className="grid gap-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`group rounded-2xl shadow-xl p-6 transition-all duration-300 border-2 hover:-translate-y-1 ${
                  darkMode
                    ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-yellow-500/40 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-2xl'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Payment Icon & Method */}
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl border ${
                      darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-green-100 border-green-300'
                    }`}>
                      <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-green-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.method}</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{payment.method}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>ID: {payment.id.slice(0, 8)}...</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.amount}</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-green-600'}`}>
                      UZS {payment.amount.toLocaleString()}
                    </p>
                  </div>

                  {/* Paid Date */}
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {payment.paidAt ? t.paidAt : (t.createdAt || 'Created')}
                    </p>
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {payment.paidAt 
                        ? new Date(payment.paidAt).toLocaleDateString('uz-UZ')
                        : new Date(payment.createdAt).toLocaleDateString('uz-UZ')
                      }
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      {payment.paidAt 
                        ? new Date(payment.paidAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                        : new Date(payment.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                      }
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.status}</p>
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border-2 ${getStatusColor(payment.status)}`}>
                      {payment.status === 'CONFIRMED' && '✓ '}
                      {getStatusText(payment.status)}
                    </span>
                  </div>
                </div>

                {/* Invoice ID Reference */}
                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    {t.invoiceId}: <span className="font-mono">{payment.invoiceId}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
