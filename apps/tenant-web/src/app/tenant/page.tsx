'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantProfile, getTenantInvoices } from '../../lib/tenantApi';
import { ApiError, fetchTenantApi } from '../../lib/api';
import { useUntypedTranslations } from '../../i18n/useUntypedTranslations';
import { useTheme } from '../../contexts/ThemeContext';
import TenantNavbar from '../../components/TenantNavbar';
import DaritalLoader from '../../components/DaritalLoader';
import PaymentChart from '../../components/PaymentChart';
import SystemStatus from '../../components/SystemStatus';

interface ChartData {
  chartData: { month: string; monthLabel: string; paid: number; due: number }[];
  summary: {
    totalPaid: number;
    totalDue: number;
    onTimePayments: number;
    latePayments: number;
    averagePayment: number;
  };
}

function toNumber(val: unknown): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'object' && val !== null && 'toNumber' in val && typeof (val as { toNumber: () => number }).toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

function formatDueDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const TenantDashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileData, invoicesData, chartDataResult] = await Promise.all([
          getTenantProfile(),
          getTenantInvoices().catch(() => []),
          fetchTenantApi('/tenant/receipts/chart-data').catch(() => null),
        ]);
        setProfile(profileData);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        setChartData(chartDataResult as ChartData | null);
      } catch (err) {
        console.error(err);
        if (typeof window !== 'undefined' && err instanceof ApiError && err.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  if (loading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  const activeContract = profile?.contracts?.find((c: any) => c.status === 'ACTIVE') || profile?.contracts?.[0];
  const activeUnit = activeContract?.unit?.name || 'N/A';
  const monthlyAmount = activeContract ? toNumber(activeContract.amount) : 0;
  const nextPendingInvoice = invoices.find((inv: any) => inv.status === 'PENDING' || inv.status === 'OVERDUE');
  const nextDueDate = nextPendingInvoice?.dueDate ? new Date(nextPendingInvoice.dueDate) : null;
  const hasOverdue = nextPendingInvoice?.status === 'OVERDUE';

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
        <div className="mb-8 animate-fade-in">
          <h1 className={`text-4xl md:text-5xl font-bold mb-3 ${
            darkMode
              ? 'text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]'
              : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
          }`}
          style={darkMode ? {
            textShadow: '0 0 20px rgba(234, 179, 8, 0.3), 0 0 40px rgba(234, 179, 8, 0.2)',
            WebkitTextStroke: '1px rgba(234, 179, 8, 0.3)'
          } : {}}>
            {t.welcomeBack}, {profile?.fullName}
          </h1>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            {darkMode ? t.premiumOverview : t.propertyOverview}
          </p>
        </div>

        {/* System Status Indicator */}
        <div className="flex justify-center mb-6">
          <SystemStatus />
        </div>

        {/* Stats Grid — bitta qatorda */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Keyingi to'lov muddati */}
          <div className={`group relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 p-4 sm:p-5 hover:-translate-y-2 ${
            darkMode
              ? 'bg-gradient-to-br from-amber-900/40 via-gray-900 to-black border-2 border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]'
              : 'bg-white border-2 border-amber-200 hover:border-amber-400 hover:shadow-3xl'
          }`}>
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${
              darkMode ? 'bg-amber-500 opacity-25' : 'bg-amber-400 opacity-20'
            }`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 sm:p-2.5 rounded-xl border ${
                  darkMode ? 'bg-amber-500/20 border-amber-500/50' : 'bg-amber-100 border-amber-200'
                }`}>
                  <svg className={`w-5 h-5 sm:w-5 sm:h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{t.nextPaymentDue}</span>
              </div>
              {nextDueDate ? (
                <>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-0.5 ${hasOverdue ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-white' : 'text-gray-800')}`}>
                    {formatDueDate(nextDueDate)}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {hasOverdue ? t.overdue : t.pending}
                  </p>
                </>
              ) : (
                <>
                  <h3 className={`text-base sm:text-lg font-semibold mb-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {t.noUpcomingPayment}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.paid}</p>
                </>
              )}
            </div>
          </div>

          {/* Oyiga to'lov */}
          <div className={`group relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 p-4 sm:p-5 hover:-translate-y-2 ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-2 border-yellow-500/40 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
              : 'bg-white border border-blue-100 hover:border-blue-300 hover:shadow-3xl'
          }`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
              darkMode ? 'bg-yellow-500 opacity-30' : 'bg-blue-500 opacity-20'
            }`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 border ${
                  darkMode ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/50' : 'bg-blue-100 group-hover:bg-blue-200 border-transparent'
                }`}>
                  <svg className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-gray-500'}`}>{t.monthlyPayment}</span>
              </div>
              <h3 className={`text-lg sm:text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                UZS {monthlyAmount.toLocaleString()}
              </h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.monthlyRent}</p>
            </div>
          </div>

          {/* Unit Card */}
          <div className={`group relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 p-4 sm:p-5 hover:-translate-y-2 ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-2 border-yellow-500/40 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]'
              : 'bg-white border border-blue-100 hover:border-blue-300 hover:shadow-3xl'
          }`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
              darkMode ? 'bg-yellow-500 opacity-30' : 'bg-blue-500 opacity-20'
            }`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 border ${
                  darkMode 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/50' 
                    : 'bg-blue-100 group-hover:bg-blue-200 border-transparent'
                }`}>
                  <svg className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-gray-500'}`}>{t.property}</span>
              </div>
              <h3 className={`text-lg sm:text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{activeUnit}</h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.yourActiveUnit}</p>
            </div>
          </div>

        </div>

        {/* Quick Actions */}
        <div className={`rounded-2xl shadow-2xl p-6 transition-all duration-500 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-2 border-yellow-500/40'
            : 'bg-white border border-blue-100'
        }`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {darkMode && <span className="text-yellow-400">✦ </span>}
            {t.quickActions}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="/tenant/invoices" className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border ${
              darkMode
                ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400'
                : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-transparent'
            }`}>
              <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 border ${
                darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white border-transparent'
              }`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t.viewInvoices}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.checkYourBills}</p>
              </div>
            </a>

            <a href="/tenant/payments" className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border ${
              darkMode
                ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400'
                : 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-transparent'
            }`}>
              <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 border ${
                darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white border-transparent'
              }`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-green-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t.paymentHistory}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.viewTransactions}</p>
              </div>
            </a>

            <a href="/tenant/contracts" className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border ${
              darkMode
                ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400'
                : 'bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-transparent'
            }`}>
              <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 border ${
                darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white border-transparent'
              }`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{t.viewContracts}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.contractDetails}</p>
              </div>
            </a>

            <a href="/tenant/chat" className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border ${
              darkMode
                ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400'
                : 'bg-gradient-to-r from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 border-transparent'
            }`}>
              <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 border ${
                darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white border-transparent'
              }`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-pink-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>💬 {t.getSupport}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Live Chat Support</p>
              </div>
            </a>

            <a href="/tenant/documents" className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border ${
              darkMode
                ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400'
                : 'bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-transparent'
            }`}>
              <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 border ${
                darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white border-transparent'
              }`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>📁 {t.documents || 'Documents'}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.viewDocuments || 'Receipts & Files'}</p>
              </div>
            </a>
          </div>
        </div>

        {/* Payment History Chart */}
        {chartData && chartData.chartData.length > 0 && (
          <div className="mt-8">
            <PaymentChart chartData={chartData.chartData} summary={chartData.summary} />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}} />
      </div>
    </>
  );
}

export default TenantDashboard;
