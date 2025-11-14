'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { fetchApi, ApiError } from '../../../lib/api';

export default function AdminReportsPage() {
  const { user, loading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('reports.view')) {
        setPageLoading(false);
        return;
      }
      // Set default date range for demonstration
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);

      setPageLoading(false);
      // In a real app, you would trigger a report fetch here
      // fetchReports(startDate, endDate);
    }
  }, [loading, user, hasPermission]);

  const fetchReports = async () => {
    if (!user || !hasPermission('reports.view')) return;
    setPageLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any>(`/reports?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while fetching reports.');
      }
    } finally {
      setPageLoading(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className={`flex flex-1 items-center justify-center min-h-screen ${
        darkMode ? 'bg-black' : 'bg-gray-100'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
          darkMode ? 'border-blue-500' : 'border-blue-500'
        }`}></div>
      </div>
    );
  }

  if (!user || !hasPermission('reports.view')) {
    return <NoAccess />;
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.reports || 'Reports' },
        ]}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t.reports || 'Reports'}
        </h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.generateAndViewReports || 'Generate and view financial reports'}
        </p>
      </div>

      {error && (
        <div className={`mb-4 px-4 py-3 rounded-lg border ${
          darkMode
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-red-100 border-red-400 text-red-700'
        }`} role="alert">
          {error}
        </div>
      )}

      <div className={`shadow-md rounded-lg p-6 mb-6 border ${
        darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>{t.dateRange}</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label htmlFor="startDate" className={`block text-sm font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>{t.startDate}</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 ${
                darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
              } border`}
            />
          </div>
          <div>
            <label htmlFor="endDate" className={`block text-sm font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>{t.endDate}</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 ${
                darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
              } border`}
            />
          </div>
          <button 
            onClick={fetchReports} 
            className={`px-4 py-2 rounded-lg hover:opacity-90 transition-colors mt-1 ${
              darkMode
                ? 'bg-blue-500 text-white hover:bg-blue-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={!startDate || !endDate}
          >
            {t.generateReport || 'Generate Report'}
          </button>
        </div>
      </div>

      {reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`shadow-md rounded-lg p-6 border ${
              darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{t.totalRevenue || 'Total Revenue'}</h3>
              <p className={`text-2xl font-bold ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(reportData.summary?.totalRevenue || 0)}
              </p>
            </div>
            <div className={`shadow-md rounded-lg p-6 border ${
              darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{t.totalInvoiced || 'Total Invoiced'}</h3>
              <p className={`text-2xl font-bold ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(reportData.summary?.totalInvoiced || 0)}
              </p>
            </div>
            <div className={`shadow-md rounded-lg p-6 border ${
              darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{t.pendingPayments || 'Pending Payments'}</h3>
              <p className={`text-2xl font-bold ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(reportData.summary?.pendingPayments || 0)}
              </p>
            </div>
            <div className={`shadow-md rounded-lg p-6 border ${
              darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{t.outstandingAmount || 'Outstanding Amount'}</h3>
              <p className={`text-2xl font-bold ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(reportData.summary?.outstandingAmount || 0)}
              </p>
            </div>
          </div>

          {/* Contracts Statistics */}
          <div className={`shadow-md rounded-lg p-6 ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>{t.contracts || 'Contracts'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.total || 'Total'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>{reportData.contracts?.total || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.active || 'Active'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>{reportData.contracts?.active || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.completed || 'Completed'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>{reportData.contracts?.completed || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.draft || 'Draft'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>{reportData.contracts?.draft || 0}</p>
              </div>
            </div>
          </div>

          {/* Payments Statistics */}
          <div className={`shadow-md rounded-lg p-6 ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>{t.payments || 'Payments'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.total || 'Total'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>{reportData.payments?.total || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.confirmed || 'Confirmed'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>{reportData.payments?.confirmed || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.pending || 'Pending'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>{reportData.payments?.pending || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.cancelled || 'Cancelled'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>{reportData.payments?.cancelled || 0}</p>
              </div>
            </div>
          </div>

          {/* Invoices Statistics */}
          <div className={`shadow-md rounded-lg p-6 ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>{t.invoices || 'Invoices'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.total || 'Total'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>{reportData.invoices?.total || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.paid || 'Paid'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>{reportData.invoices?.paid || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.pending || 'Pending'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>{reportData.invoices?.pending || 0}</p>
              </div>
              <div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.overdue || 'Overdue'}</p>
                <p className={`text-2xl font-bold ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>{reportData.invoices?.overdue || 0}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`shadow-md rounded-lg p-6 text-center border ${
          darkMode 
            ? 'bg-black border-blue-600/30 text-gray-400' 
            : 'bg-white border-gray-200 text-gray-500'
        }`}>
          {t.selectDatesAndGenerate}
        </div>
      )}
    </div>
  );
}
