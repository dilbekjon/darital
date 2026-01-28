'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError, normalizeListResponse } from '../../../lib/api';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../../../lib/auth';
import DaritalLoader from '../../../components/DaritalLoader';

interface Invoice {
  id: string;
  contractId: string;
  dueDate: string;
  amount: number | { toNumber?: () => number };
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  contract?: {
    id: string;
    tenantId: string;
    tenant?: {
      id: string;
      fullName: string;
      email: string;
    };
    unit?: {
      name: string;
    };
  };
  payments?: Array<{
    id: string;
    status: string;
    amount?: number | { toNumber?: () => number };
    method?: 'ONLINE' | 'OFFLINE';
    providerPaymentId?: string | null;
    rawPayload?: any;
    createdAt?: string;
  }> | undefined;
}

interface QrCodeData {
  invoiceId: string;
  amount: number | { toNumber?: () => number };
  qrString: string | null;
  paid: boolean;
  status: string;
}

export default function AdminInvoicesPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tenantIdFilter, setTenantIdFilter] = useState<string>('');
  const [contractIdFilter, setContractIdFilter] = useState<string>('');
  const [dueFromFilter, setDueFromFilter] = useState<string>('');
  const [dueToFilter, setDueToFilter] = useState<string>('');
  const [sortByDeadline, setSortByDeadline] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<QrCodeData | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [contracts, setContracts] = useState<Array<{ id: string; tenant?: { fullName: string; email: string }; unit?: { name: string } }>>([]);
  const [createForm, setCreateForm] = useState({
    contractId: '',
    dueDate: '',
    amount: '',
  });
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({
    dueDate: '',
    amount: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      setPageLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        includeArchived: 'false',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (tenantIdFilter) params.append('tenantId', tenantIdFilter);
      if (contractIdFilter) params.append('contractId', contractIdFilter);
      if (dueFromFilter) params.append('dueFrom', dueFromFilter);
      if (dueToFilter) params.append('dueTo', dueToFilter);

      const data = await fetchApi<any>(`/invoices?${params.toString()}`);
      const result = normalizeListResponse<Invoice>(data);
      setInvoices(result.items);
      setMeta(result.meta || null);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setPageLoading(false);
    }
  }, [currentPage, limit, statusFilter, tenantIdFilter, contractIdFilter, dueFromFilter, dueToFilter, t.unexpectedError]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('invoices.read')) {
        setPageLoading(false);
        return;
      }
      loadInvoices();
      
      // Load contracts for create invoice modal
      if (hasPermission('contracts.update')) {
        fetchApi<any[]>('/contracts?limit=1000')
          .then((data) => {
            const normalized = normalizeListResponse<any>(data);
            setContracts(normalized.items || []);
          })
          .catch((err) => {
            console.error('Failed to load contracts:', err);
          });
      }
    }
  }, [loading, user, hasPermission, loadInvoices]);

  useEffect(() => {
    if (!user || !hasPermission('invoices.read')) {
      return;
    }
    const token = getToken();
    if (!token) {
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connected', () => {
      socket.emit('join_room', { room: 'admin' });
    });

    socket.on('payment_updated', () => {
      loadInvoices();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, hasPermission, loadInvoices]);

  const handleViewQr = async (invoiceId: string) => {
    setLoadingQr(true);
    try {
      const data = await fetchApi<QrCodeData>(`/invoices/${invoiceId}/qr`);
      setQrData(data);
      setQrModalOpen(true);
    } catch (err) {
      console.error('Failed to load QR code:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setLoadingQr(false);
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    if (!hasPermission('payments.capture_offline')) {
      setError(t.noPermissionToMarkPaid);
      return;
    }

    const amount = typeof invoice.amount === 'object' && invoice.amount.toNumber
      ? invoice.amount.toNumber()
      : Number(invoice.amount);

    setMarkingPaid(invoice.id);
    try {
      // Create offline payment
      const payment = await fetchApi<{ id: string }>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: invoice.id,
          method: 'OFFLINE',
          amount: amount.toString(),
        }),
      });
      
      // Confirm the payment
      await fetchApi(`/payments/${payment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'CONFIRMED',
        }),
      });
      
      await loadInvoices();
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t.failedToMarkPaid);
      }
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleVerifyPayment = async (paymentId: string, accept: boolean) => {
    if (!hasPermission('payments.capture_offline')) {
      setError('You do not have permission to verify payments');
      return;
    }

    setVerifyingPaymentId(paymentId);
    setError(null);
    try {
      const endpoint = accept
        ? `/payments/${paymentId}/verify/accept`
        : `/payments/${paymentId}/verify/decline`;

      const body = accept ? undefined : JSON.stringify({ reason: 'Payment could not be verified' });
      await fetchApi(endpoint, { method: 'PATCH', body });
      await loadInvoices();
    } catch (err) {
      console.error(`Failed to ${accept ? 'accept' : 'decline'} payment:`, err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(`An unexpected error occurred while ${accept ? 'accepting' : 'declining'} payment.`);
      }
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleCreateInvoice = async () => {
    if (!createForm.contractId || !createForm.dueDate || !createForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    setCreatingInvoice(true);
    setError(null);

    try {
      await fetchApi('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          contractId: createForm.contractId,
          dueDate: new Date(createForm.dueDate).toISOString(),
          amount: createForm.amount,
        }),
      });

      // Reset form and close modal
      setCreateForm({ contractId: '', dueDate: '', amount: '' });
      setCreateModalOpen(false);
      
      // Reload invoices
      await loadInvoices();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create invoice. Please try again.');
      }
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleOpenEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditForm({
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      amount: getAmount(invoice.amount).toString(),
    });
    setEditModalOpen(true);
  };

  const handleEditInvoice = async () => {
    if (!editingInvoice || !editForm.dueDate || !editForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      await fetchApi(`/invoices/${editingInvoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          dueDate: new Date(editForm.dueDate).toISOString(),
          amount: editForm.amount,
        }),
      });

      // Reset form and close modal
      setEditForm({ dueDate: '', amount: '' });
      setEditingInvoice(null);
      setEditModalOpen(false);
      
      // Reload invoices
      await loadInvoices();
    } catch (err) {
      console.error('Failed to update invoice:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update invoice. Please try again.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!hasPermission('contracts.update')) {
      setError('You do not have permission to delete invoices');
      return;
    }

    setDeletingInvoiceId(invoiceId);
    setError(null);

    try {
      await fetchApi(`/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      // Close confirmation modal
      setDeleteConfirmOpen(null);
      
      // Reload invoices
      await loadInvoices();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete invoice. Please try again.');
      }
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  const getAmount = (amount: number | { toNumber?: () => number }): number => {
    if (typeof amount === 'object' && amount.toNumber) {
      return amount.toNumber();
    }
    return Number(amount);
  };

  type Payment = NonNullable<Invoice['payments']>[number];
  const isPaymentReceived = (payment: Payment | undefined): boolean => {
    if (!payment) return false;
    if (payment.status === 'CONFIRMED' || payment.status === 'CANCELLED') return true;
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

  const getLatestPendingOnlinePayment = (invoice: Invoice) => {
    const payments = invoice.payments || [];
    const pendingOnline = payments.filter(
      (payment) => payment.status === 'PENDING' && payment.method === 'ONLINE',
    );
    if (pendingOnline.length === 0) return null;
    return pendingOnline
      .slice()
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })[0];
  };

  const getInvoiceDisplayStatus = (invoice: Invoice) => {
    if (invoice.status === 'PAID') return 'PAID';
    if (invoice.status === 'OVERDUE') return 'OVERDUE';
    const pendingPayment = getLatestPendingOnlinePayment(invoice);
    if (pendingPayment && isPaymentReceived(pendingPayment)) {
      return 'PAYMENT_RECEIVED';
    }
    return 'AWAITING_PAYMENT';
  };

  const getInvoiceStatusColor = (displayStatus: string) => {
    switch (displayStatus) {
      case 'PAYMENT_RECEIVED':
        return darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'AWAITING_PAYMENT':
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  // Filter by search query (email or unit name)
  const searchFilteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    
    const query = searchQuery.toLowerCase();
    return invoices.filter((invoice) => {
      const email = invoice.contract?.tenant?.email?.toLowerCase() || '';
      const unitName = invoice.contract?.unit?.name?.toLowerCase() || '';
      const tenantName = invoice.contract?.tenant?.fullName?.toLowerCase() || '';
      
      return email.includes(query) || unitName.includes(query) || tenantName.includes(query);
    });
  }, [invoices, searchQuery]);

  // Sort invoices by importance: OVERDUE > PAYMENT_RECEIVED > PENDING > PAID
  // Or by closest deadline if sortByDeadline is enabled
  const sortedInvoices = useMemo(() => {
    if (sortByDeadline) {
      // Sort purely by deadline (closest first), regardless of status
      return [...searchFilteredInvoices].sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    
    const statusPriority: Record<string, number> = { 
      OVERDUE: 0, 
      PAYMENT_RECEIVED: 1,
      PENDING: 2, 
      PAID: 3 
    };
    
    return [...searchFilteredInvoices].sort((a, b) => {
      // Get display status which accounts for payment received state
      const displayA = getInvoiceDisplayStatus(a);
      const displayB = getInvoiceDisplayStatus(b);
      
      const priorityA = statusPriority[displayA] ?? statusPriority[a.status] ?? 4;
      const priorityB = statusPriority[displayB] ?? statusPriority[b.status] ?? 4;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Within same status, sort by due date (earlier first for unpaid, later first for paid)
      if (a.status === 'PAID') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [searchFilteredInvoices, sortByDeadline]);

  const getInvoiceStatusText = (displayStatus: string) => {
    switch (displayStatus) {
      case 'PAYMENT_RECEIVED':
        return 'Payment Received';
      case 'AWAITING_PAYMENT':
        return 'Awaiting Payment';
      case 'PAID':
        return t.paid;
      case 'OVERDUE':
        return t.overdue;
      default:
        return displayStatus;
    }
  };

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('invoices.read')) {
    return <NoAccess />;
  }

  const canCaptureOffline = hasPermission('payments.capture_offline');

  return (
    <div className={`p-4 sm:p-6 lg:p-8 h-full overflow-y-auto ${
      darkMode ? 'bg-black' : 'bg-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto pb-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: t.dashboard || 'Dashboard', href: '/dashboard' },
            { label: t.invoices },
          ]}
        />

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t.invoices}
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t.viewAndManageInvoices}
          </p>
        </div>
        {hasPermission('contracts.update') && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            + {(t as any).createInvoice || 'Create Invoice'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by email or unit name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`block w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <div className="sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="">{t.allStatus}</option>
            <option value="PENDING">{t.pending}</option>
            <option value="PAID">{t.paid}</option>
            <option value="OVERDUE">{t.overdue}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t.tenantIdOptional}
            value={tenantIdFilter}
            onChange={(e) => {
              setTenantIdFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`block w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={(t as any).contractIdOptional || 'Contract ID (optional)'}
            value={contractIdFilter}
            onChange={(e) => {
              setContractIdFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`block w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <div className="sm:w-40">
          <input
            type="date"
            placeholder={t.dueFrom}
            value={dueFromFilter}
            onChange={(e) => {
              setDueFromFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`block w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <div className="sm:w-40">
          <input
            type="date"
            placeholder={t.dueTo}
            value={dueToFilter}
            onChange={(e) => {
              setDueToFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`block w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <div className="sm:w-auto">
          <button
            onClick={() => {
              setSortByDeadline(!sortByDeadline);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              sortByDeadline
                ? darkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {sortByDeadline ? 'Sort by Status' : 'Sort by Deadline'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`shadow-md rounded-lg overflow-hidden border ${
        darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
      }`}>
        {sortedInvoices.length === 0 ? (
          <EmptyState
            icon={
              <svg className={`w-16 h-16 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title={sortedInvoices.length === 0 ? t.noInvoicesFound : t.noResultsFound}
            description={
              sortedInvoices.length === 0
                ? t.invoiceRecordsWillAppear
                : t.tryAdjustingFilters
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
                    {t.dueDate}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.tenant}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.unit}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.amount}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.status}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}>
                {sortedInvoices.map((invoice, index) => {
                  const displayStatus = getInvoiceDisplayStatus(invoice);
                  const pendingPayment = getLatestPendingOnlinePayment(invoice);
                  const showVerifyButtons =
                    !!pendingPayment &&
                    isPaymentReceived(pendingPayment) &&
                    canCaptureOffline &&
                    pendingPayment.status === 'PENDING';

                  return (
                    <tr
                      key={invoice.id}
                      className={`transition-colors ${
                          index % 2 === 0 
                            ? (darkMode ? 'bg-black' : 'bg-white') 
                            : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                        } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'}`}
                    >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <div>
                        <div className="font-medium">
                          {invoice.contract?.tenant?.fullName || t.notAvailable}
                        </div>
                        <div className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {invoice.contract?.tenant?.email || ''}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {invoice.contract?.unit?.name || t.notAvailable}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      UZS {getAmount(invoice.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInvoiceStatusColor(displayStatus)}`}>
                        {getInvoiceStatusText(displayStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewQr(invoice.id)}
                          disabled={loadingQr}
                          className={`transition-colors ${
                            darkMode
                              ? 'text-blue-400 hover:text-blue-300 disabled:text-gray-600'
                              : 'text-blue-600 hover:text-blue-900 disabled:text-gray-400'
                          }`}
                        >
                          {loadingQr ? t.loading : t.viewQr}
                        </button>
                        {hasPermission('contracts.update') && invoice.status !== 'PAID' && (
                          <button
                            onClick={() => handleOpenEditModal(invoice)}
                            className={`transition-colors ${
                              darkMode
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-yellow-600 hover:text-yellow-700'
                            }`}
                          >
                            {t.edit || 'Edit'}
                          </button>
                        )}
                        {canCaptureOffline && invoice.status !== 'PAID' && (
                          <button
                            onClick={() => handleMarkPaid(invoice)}
                            disabled={markingPaid === invoice.id}
                            className={`transition-colors ${
                              darkMode
                                ? 'text-green-400 hover:text-green-300 disabled:text-gray-600'
                                : 'text-green-600 hover:text-green-900 disabled:text-gray-400'
                            }`}
                          >
                            {markingPaid === invoice.id ? t.processing : t.markPaid}
                          </button>
                        )}
                        {showVerifyButtons && pendingPayment && (
                          <>
                            <button
                              onClick={() => handleVerifyPayment(pendingPayment.id, true)}
                              disabled={verifyingPaymentId === pendingPayment.id}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-green-400 hover:text-green-300 disabled:text-gray-600'
                                  : 'text-green-600 hover:text-green-900 disabled:text-gray-400'
                              }`}
                            >
                              {verifyingPaymentId === pendingPayment.id ? t.processing : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleVerifyPayment(pendingPayment.id, false)}
                              disabled={verifyingPaymentId === pendingPayment.id}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-red-400 hover:text-red-300 disabled:text-gray-600'
                                  : 'text-red-600 hover:text-red-900 disabled:text-gray-400'
                              }`}
                            >
                              {verifyingPaymentId === pendingPayment.id ? t.processing : 'Decline'}
                            </button>
                          </>
                        )}
                        {hasPermission('contracts.update') && invoice.status !== 'PAID' && (
                          <button
                            onClick={() => setDeleteConfirmOpen(invoice.id)}
                            className={`transition-colors ${
                              darkMode
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-red-600 hover:text-red-700'
                            }`}
                          >
                            {t.delete || 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className={`mt-4 flex items-center justify-between ${
          darkMode ? 'text-white' : 'text-gray-700'
        }`}>
          <div className="text-sm">
            {t.showing} {((meta.page - 1) * meta.limit) + 1} {t.to} {Math.min(meta.page * meta.limit, meta.total)} {t.of} {meta.total} {t.invoices.toLowerCase()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white disabled:opacity-50'
                  : 'bg-white border-gray-300 text-gray-900 disabled:opacity-50'
              }`}
            >
              {t.previous}
            </button>
            <span className={`px-4 py-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t.page} {meta.page} {t.of} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white disabled:opacity-50'
                  : 'bg-white border-gray-300 text-gray-900 disabled:opacity-50'
              }`}
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalOpen && qrData && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setQrModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
              darkMode ? 'bg-gray-900 border border-blue-600/30' : 'bg-white'
            }`}>
              <div className="mb-4 flex justify-between items-center">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {t.qrCode}
                </h2>
                <button
                  onClick={() => setQrModalOpen(false)}
                  className={`text-2xl ${
                    darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.invoiceId}: {qrData.invoiceId}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.amount}: UZS {getAmount(qrData.amount).toLocaleString()}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.status}: {qrData.status === 'PENDING' ? t.pending :
                                 qrData.status === 'PAID' ? t.paid :
                                 qrData.status === 'OVERDUE' ? t.overdue : qrData.status}
                  </p>
                </div>
                {qrData.qrString ? (
                  <div className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-black border-blue-600/30' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={`text-xs font-mono break-all ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {qrData.qrString}
                    </p>
                  </div>
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.qrCodeNotAvailable}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !creatingInvoice && setCreateModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
              darkMode ? 'bg-gray-900 border border-blue-600/30' : 'bg-white'
            }`}>
              <div className="mb-4 flex justify-between items-center">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {(t as any).createInvoice || 'Create Invoice'}
                </h2>
                <button
                  onClick={() => !creatingInvoice && setCreateModalOpen(false)}
                  disabled={creatingInvoice}
                  className={`text-2xl ${
                    darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  } disabled:opacity-50`}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Contract Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                     {(t as any).contract || 'Contract'} *
                  </label>
                  <select
                    value={createForm.contractId}
                    onChange={(e) => setCreateForm({ ...createForm, contractId: e.target.value })}
                    disabled={creatingInvoice}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-900 border-blue-600/30 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                  >
                    <option value="">{(t as any).selectContract || 'Select a contract'}</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.tenant?.fullName || 'Unknown'} - {contract.unit?.name || 'No Unit'} ({contract.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.dueDate || 'Due Date'} *
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    disabled={creatingInvoice}
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-900 border-blue-600/30 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.amount || 'Amount'} (UZS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    disabled={creatingInvoice}
                    placeholder="1000000.00"
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-100 border border-red-400 text-red-700'
                  }`}>
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => !creatingInvoice && setCreateModalOpen(false)}
                    disabled={creatingInvoice}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50'
                    }`}
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                  <button
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice || !createForm.contractId || !createForm.dueDate || !createForm.amount}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {creatingInvoice ? (t.processing || 'Processing...') : (t.create || 'Create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Invoice Modal */}
      {editModalOpen && editingInvoice && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !savingEdit && setEditModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
              darkMode ? 'bg-gray-900 border border-blue-600/30' : 'bg-white'
            }`}>
              <div className="mb-4 flex justify-between items-center">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {(t as any).editInvoice || 'Edit Invoice'}
                </h2>
                <button
                  onClick={() => !savingEdit && setEditModalOpen(false)}
                  disabled={savingEdit}
                  className={`text-2xl ${
                    darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  } disabled:opacity-50`}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Invoice Info */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.tenant || 'Tenant'}: <span className="font-medium">{editingInvoice.contract?.tenant?.fullName || 'N/A'}</span>
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.unit || 'Unit'}: <span className="font-medium">{editingInvoice.contract?.unit?.name || 'N/A'}</span>
                  </p>
                </div>

                {/* Due Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.dueDate || 'Due Date'} *
                  </label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    disabled={savingEdit}
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-900 border-blue-600/30 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.amount || 'Amount'} (UZS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    disabled={savingEdit}
                    placeholder="1000000.00"
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => !savingEdit && setEditModalOpen(false)}
                    disabled={savingEdit}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50'
                    }`}
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                  <button
                    onClick={handleEditInvoice}
                    disabled={savingEdit || !editForm.dueDate || !editForm.amount}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {savingEdit ? (t.processing || 'Saving...') : (t.save || 'Save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {deleteConfirmOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !deletingInvoiceId && setDeleteConfirmOpen(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
              darkMode ? 'bg-gray-900 border border-red-600/30' : 'bg-white'
            }`}>
              <div className="mb-4 flex justify-between items-center">
                <h2 className={`text-xl font-bold ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {(t as any).deleteInvoice || 'Delete Invoice'}
                </h2>
                <button
                  onClick={() => !deletingInvoiceId && setDeleteConfirmOpen(null)}
                  disabled={deletingInvoiceId !== null}
                  className={`text-2xl ${
                    darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  } disabled:opacity-50`}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-red-900/20 border-red-600/30' : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {(t as any).deleteInvoiceWarning || 'Are you sure you want to delete this invoice? This action cannot be undone. Any pending payments associated with this invoice will also be deleted.'}
                  </p>
                </div>

                {(() => {
                  const invoiceToDelete = invoices.find(inv => inv.id === deleteConfirmOpen);
                  if (invoiceToDelete) {
                    return (
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {t.tenant || 'Tenant'}: <span className="font-medium">{invoiceToDelete.contract?.tenant?.fullName || 'N/A'}</span>
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {t.unit || 'Unit'}: <span className="font-medium">{invoiceToDelete.contract?.unit?.name || 'N/A'}</span>
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {t.amount || 'Amount'}: <span className="font-medium">UZS {getAmount(invoiceToDelete.amount).toLocaleString()}</span>
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {t.dueDate || 'Due Date'}: <span className="font-medium">{new Date(invoiceToDelete.dueDate).toLocaleDateString()}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => !deletingInvoiceId && setDeleteConfirmOpen(null)}
                    disabled={deletingInvoiceId !== null}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50'
                    }`}
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                  <button
                    onClick={() => deleteConfirmOpen && handleDeleteInvoice(deleteConfirmOpen)}
                    disabled={deletingInvoiceId !== null}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
                        : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {deletingInvoiceId ? (t.processing || 'Deleting...') : (t.delete || 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

