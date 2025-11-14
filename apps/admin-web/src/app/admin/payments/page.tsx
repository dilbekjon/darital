'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';

interface Payment {
  id: string;
  invoiceId: string;
  method: 'ONLINE' | 'OFFLINE';
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  paidAt: string | null;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const { user, loading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Filter payments based on search query, status, and method
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filter by method
    if (methodFilter !== 'ALL') {
      filtered = filtered.filter(p => p.method === methodFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.invoiceId.toLowerCase().includes(query) ||
          payment.amount.toString().includes(query) ||
          payment.status.toLowerCase().includes(query) ||
          payment.method.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [payments, searchQuery, statusFilter, methodFilter]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('payments.read')) {
        setPageLoading(false);
        return;
      }

      const loadPayments = async () => {
        try {
          const data = await fetchApi<Payment[]>('/payments'); // Assuming an admin endpoint for all payments
          setPayments(data);
        } catch (err) {
          console.error('Failed to load payments:', err);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred.');
          }
        } finally {
          setPageLoading(false);
        }
      };
      loadPayments();
    }
  }, [loading, user, hasPermission]);

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

  if (!user || !hasPermission('payments.read')) {
    return <NoAccess />;
  }

  const canCaptureOffline = hasPermission('payments.capture_offline');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${
      darkMode ? 'bg-black' : 'bg-gray-100'
    }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.payments || 'Payments' },
        ]}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t.paymentsHistory || 'Payments History'}
        </h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.viewAndManagePayments || 'View and manage payment records'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Search and Filter Bar */}
      {payments.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search payments by invoice ID, amount, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-black border-blue-600/30 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
          <div className="sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="ALL">{t.allStatus || 'All Status'}</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="sm:w-40">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="ALL">{t.allMethods || 'All Methods'}</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`shadow-md rounded-lg overflow-hidden border ${
        darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
      }`}>
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={
              <svg className={`w-16 h-16 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
            title={payments.length === 0 ? (t.noPayments || 'No payments found') : 'No results found'}
            description={
              payments.length === 0
                ? 'Payment records will appear here once payments are made.'
                : 'Try adjusting your search query or filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${
              darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
            }`}>
              <thead className={`sticky top-0 ${
                darkMode ? 'bg-black border-b border-blue-600/30' : 'bg-gray-50'
              }`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.invoiceId || 'Invoice ID'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.method || 'Method'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.amount || 'Amount'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.status || 'Status'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.paidAt || 'Paid At'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}>
                {filteredPayments.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className={`transition-colors ${
                        index % 2 === 0 
                          ? (darkMode ? 'bg-black' : 'bg-white') 
                          : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                      } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {payment.invoiceId}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {payment.method}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      UZS {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canCaptureOffline && payment.status === 'PENDING' && (
                        <button 
                          // onClick={() => handleCaptureOffline(payment.id)}
                          className={`transition-colors ${
                            darkMode
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-900'
                          }`}
                        >
                          {t.captureOffline || 'Capture'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
