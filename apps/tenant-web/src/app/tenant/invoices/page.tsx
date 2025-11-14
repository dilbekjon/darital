'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantInvoices } from '../../../lib/tenantApi';
import { ApiError } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';

const InvoicePage = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();
  const { darkMode } = useTheme();

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
        {invoices.length === 0 ? (
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
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`group rounded-2xl shadow-xl p-6 transition-all duration-300 border-2 hover:-translate-y-1 ${
                  darkMode
                    ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-yellow-500/40 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-2xl'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Unit Name */}
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl border ${
                      darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-blue-100 border-blue-300'
                    }`}>
                      <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.unitName}</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{invoice.unitName}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.amount}</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-blue-600'}`}>
                      UZS {invoice.amount.toLocaleString()}
                    </p>
                  </div>

                  {/* Due Date */}
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.dueDate}</p>
                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(invoice.dueDate).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.status}</p>
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border-2 ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default InvoicePage;
