'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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

interface Tenant {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  contractId?: string;
  contract?: {
    id: string;
    tenantId?: string;
    unitId?: string;
    tenant?: { id: string; fullName?: string; email?: string; phone?: string };
    unit?: { id: string; name?: string };
  };
}

interface Unit {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  method: 'ONLINE' | 'OFFLINE';
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  paidAt: string | null;
  createdAt: string;
  provider?: string;
  providerPaymentId?: string;
  rawPayload?: any;
  // Offline payment tracking
  collectedBy?: string;
  collectedAt?: string;
  collectorNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  tenant?: Tenant;
  unit?: Unit;
  invoice?: Invoice;
}

interface PaymentStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  overdue: number;
  totalAmount: number;
  confirmedAmount: number;
  pendingAmount: number;
}

export default function AdminPaymentsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [overdueFilter, setOverdueFilter] = useState<boolean>(false);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    status: '' as '' | 'PENDING' | 'CONFIRMED' | 'CANCELLED',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // Record Offline Payment Modal State
  const [recordOfflineModalOpen, setRecordOfflineModalOpen] = useState(false);
  const [recordingOffline, setRecordingOffline] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [offlineInvoiceSearch, setOfflineInvoiceSearch] = useState('');
  const [offlineForm, setOfflineForm] = useState({
    invoiceId: '',
    amount: '',
    collectorNote: '',
  });

  // Load payments function - wrapped in useCallback to prevent stale closures
  const loadPayments = useCallback(async () => {
    try {
      const data = await fetchApi<any>('/payments?limit=1000&includeArchived=false');
      const updatedPayments = normalizeListResponse<Payment>(data).items;
      setPayments(updatedPayments);
      setError(null);
      console.log(`✅ [Payments] Loaded ${updatedPayments.length} payments`);
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
  }, []);

  // Load pending invoices for offline payment recording
  const loadPendingInvoices = useCallback(async () => {
    try {
      const data = await fetchApi<any>('/invoices?status=PENDING&limit=1000');
      const result = normalizeListResponse<Invoice>(data);
      setInvoices(result.items || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  }, []);

  // Record offline payment
  const handleRecordOfflinePayment = async () => {
    if (!offlineForm.invoiceId || !offlineForm.amount) {
      setError('Hisob-faktura va miqdorni tanlang');
      return;
    }

    setRecordingOffline(true);
    setError(null);

    try {
      await fetchApi<any>('/payments/offline', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: offlineForm.invoiceId,
          amount: offlineForm.amount,
          collectorNote: offlineForm.collectorNote || undefined,
        }),
      });

      // Reset form and close modal
      setOfflineForm({ invoiceId: '', amount: '', collectorNote: '' });
      setOfflineInvoiceSearch('');
      setRecordOfflineModalOpen(false);
      
      // Reload payments to show the new one
      await loadPayments();
    } catch (err) {
      console.error('Failed to record offline payment:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Oflayn to\'lovni yozishda xato yuz berdi');
      }
    } finally {
      setRecordingOffline(false);
    }
  };

  // Filter pending invoices by search (tenant name, contract id, invoice id, unit name)
  const offlineFilteredInvoices = useMemo(() => {
    const q = offlineInvoiceSearch.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const tenantName = inv.contract?.tenant?.fullName?.toLowerCase() ?? '';
      const tenantContact = inv.contract?.tenant?.phone?.toLowerCase() ?? inv.contract?.tenant?.email?.toLowerCase() ?? '';
      const contractId = (inv.contract?.id ?? inv.contractId ?? '').toLowerCase();
      const invoiceId = inv.id.toLowerCase();
      const unitName = inv.contract?.unit?.name?.toLowerCase() ?? '';
      return (
        tenantName.includes(q) ||
        tenantContact.includes(q) ||
        contractId.includes(q) ||
        invoiceId.includes(q) ||
        unitName.includes(q)
      );
    });
  }, [invoices, offlineInvoiceSearch]);

  // Open record offline payment modal
  const openRecordOfflineModal = async () => {
    setOfflineInvoiceSearch('');
    await loadPendingInvoices();
    setRecordOfflineModalOpen(true);
  };

  // Handle payment verification (Accept/Decline) — Cashier/Admin/Super Admin
  const handleVerifyPayment = async (paymentId: string, accept: boolean) => {
    if (!hasPermission('payments.approve')) {
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

      await fetchApi<any>(endpoint, {
        method: 'PATCH',
        body: body,
      });

      // Reload payments to reflect updated status
      await loadPayments();
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

  // Handle payment deletion
  const handleDeletePayment = async (paymentId: string) => {
    if (!hasPermission('payments.capture_offline')) {
      setError('You do not have permission to delete payments');
      return;
    }

    setDeletingPaymentId(paymentId);
    setError(null);

    try {
      await fetchApi<any>(`/payments/${paymentId}`, {
        method: 'DELETE',
      });

      await loadPayments();
      setDeleteConfirmOpen(null);
    } catch (err) {
      console.error('Failed to delete payment:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while deleting payment.');
      }
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // Handle opening edit modal
  const handleOpenEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setEditForm({
      amount: payment.amount.toString(),
      status: payment.status,
    });
    setEditModalOpen(true);
  };

  // Handle payment edit
  const handleEditPayment = async () => {
    if (!editingPayment || !editForm.amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!hasPermission('payments.capture_offline')) {
      setError('You do not have permission to edit payments');
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      await fetchApi(`/payments/${editingPayment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editForm.status || undefined,
        }),
      });

      // Reset form and close modal
      setEditForm({ amount: '', status: '' });
      setEditingPayment(null);
      setEditModalOpen(false);
      
      // Reload payments
      await loadPayments();
    } catch (err) {
      console.error('Failed to update payment:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update payment. Please try again.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Helper to check if payment was actually received (webhook confirmed payment, not just intent created)
  // Must be defined before useMemo that uses it
  const isPaymentReceived = (payment: Payment): boolean => {
    // If payment is already CONFIRMED or CANCELLED, it was processed
    if (payment.status === 'CONFIRMED' || payment.status === 'CANCELLED') {
      return true;
    }

    // For PENDING payments, check if payment was actually received
    if (payment.method === 'OFFLINE') {
      // OFFLINE payments don't have webhooks, check if they have providerPaymentId set
      return !!payment.providerPaymentId;
    }

    // For ONLINE payments, check if rawPayload contains payment confirmation data
    // (not just invoice creation data from createPaymentIntent)
    const rawPayload = payment.rawPayload;
    if (!rawPayload) return false;

    // CheckoutUz: Payment is confirmed if rawPayload has checkoutUz.payment.status === 'paid'
    // OR if webhook field exists (indicating webhook was received)
    if (rawPayload.checkoutUz?.payment?.status === 'paid' || rawPayload.webhook) {
      return true;
    }

    // Generic webhook: Check if rawPayload has status indicating payment success
    if (rawPayload.status === 'paid' || rawPayload.status === 'success' || rawPayload.paidAt) {
      return true;
    }

    // If rawPayload exists but doesn't have payment confirmation indicators,
    // it's likely just invoice creation data (from createPaymentIntent)
    return false;
  };

  // Calculate statistics
  const stats: PaymentStats = useMemo(() => {
    const stats: PaymentStats = {
      total: payments.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      overdue: 0,
      totalAmount: 0,
      confirmedAmount: 0,
      pendingAmount: 0,
    };

    payments.forEach((payment) => {
      stats.totalAmount += payment.amount;
      
      // Check if payment was actually received (using helper function)
      const paymentReceived = isPaymentReceived(payment);
      
      if (payment.status === 'CONFIRMED') {
        stats.confirmed++;
        stats.confirmedAmount += payment.amount;
      } else if (payment.status === 'PENDING') {
        // Only count as "pending" if payment was actually received (awaiting verification)
        // For OFFLINE payments, check if they have providerPaymentId
        if (paymentReceived || (payment.method === 'OFFLINE' && payment.providerPaymentId)) {
          stats.pending++;
          stats.pendingAmount += payment.amount;
        }
        // If PENDING but payment not received yet, don't count in stats
        // It's "awaiting payment", not "pending verification"
      } else if (payment.status === 'CANCELLED') {
        stats.cancelled++;
      }

      // Check if overdue (only for payments that were actually received)
      if (payment.invoice?.dueDate && payment.status === 'PENDING' && (paymentReceived || (payment.method === 'OFFLINE' && payment.providerPaymentId))) {
        const dueDate = new Date(payment.invoice.dueDate);
        const now = new Date();
        if (dueDate < now) {
          stats.overdue++;
        }
      }
    });

    return stats;
  }, [payments]);

  // Filter and sort payments by importance
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

    // Filter by overdue
    if (overdueFilter) {
      filtered = filtered.filter((payment) => {
        if (payment.status !== 'PENDING' || !payment.invoice?.dueDate) return false;
        const dueDate = new Date(payment.invoice.dueDate);
        const now = new Date();
        return dueDate < now;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.invoiceId.toLowerCase().includes(query) ||
          payment.amount.toString().includes(query) ||
          payment.status.toLowerCase().includes(query) ||
          payment.method.toLowerCase().includes(query) ||
          payment.tenant?.fullName?.toLowerCase().includes(query) ||
          (payment.tenant?.phone || payment.tenant?.email)?.toLowerCase().includes(query) ||
          payment.provider?.toLowerCase().includes(query)
      );
    }

    // Sort by importance: PENDING (with overdue first) > CANCELLED > CONFIRMED
    const now = new Date();
    const statusPriority: Record<string, number> = { PENDING: 0, CANCELLED: 1, CONFIRMED: 2 };
    
    return [...filtered].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Within PENDING, prioritize overdue invoices
      if (a.status === 'PENDING' && b.status === 'PENDING') {
        const aOverdue = a.invoice?.dueDate && new Date(a.invoice.dueDate) < now;
        const bOverdue = b.invoice?.dueDate && new Date(b.invoice.dueDate) < now;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
      }
      
      // Within same status, most recent first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [payments, searchQuery, statusFilter, methodFilter, overdueFilter]);

  // Set up WebSocket connection for real-time payment updates
  useEffect(() => {
    if (!user || !hasPermission('payments.read')) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    
    console.log('🔌 [Payments] Connecting to WebSocket for payment updates...');
    
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connected', () => {
      console.log('✅ [Payments] WebSocket connected');
    });

    // Listen for payment_updated events
    socket.on('payment_updated', (data: { payment: Payment; updatedAt: string }) => {
      console.log('💰 [Payments] Payment updated event received:', {
        id: data.payment.id,
        status: data.payment.status,
        method: data.payment.method,
      });
      // Refresh payments list automatically to get latest status
      loadPayments();
    });

    socketRef.current = socket;

    return () => {
      console.log('🔌 [Payments] Cleaning up WebSocket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, hasPermission, loadPayments]);

  // Initial load
  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('payments.read')) {
        setPageLoading(false);
        return;
      }
      loadPayments();
    }
  }, [loading, user, hasPermission]);

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('payments.read')) {
    return <NoAccess />;
  }

  const canCaptureOffline = hasPermission('payments.capture_offline');
  const canApprovePayments = hasPermission('payments.approve');

  const getStatusColor = (status: string, payment: Payment) => {
    const paymentReceived = isPaymentReceived(payment);
    
    switch (status) {
      case 'PENDING':
        // If PENDING but payment not received, show as "Awaiting Payment"
        if (!paymentReceived && payment.method === 'ONLINE') {
          return darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-600';
        }
        // PENDING with payment received means awaiting admin verification
        return darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, payment: Payment) => {
    const paymentReceived = isPaymentReceived(payment);
    
    if (status === 'PENDING') {
      // If PENDING but payment not received, show "Awaiting Payment"
      if (!paymentReceived && payment.method === 'ONLINE') {
        return 'Awaiting Payment';
      }
      // PENDING with payment received means awaiting admin verification
      return 'Pending Verification';
    }
    
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'CANCELLED': return t.cancelled || 'Bekor qilingan';
      default: return status;
    }
  };

  const isOverdue = (payment: Payment): boolean => {
    if (payment.status !== 'PENDING' || !payment.invoice?.dueDate) return false;
    const dueDate = new Date(payment.invoice.dueDate);
    const now = new Date();
    return dueDate < now;
  };

  const getDaysOverdue = (payment: Payment): number => {
    if (!payment.invoice?.dueDate) return 0;
    const dueDate = new Date(payment.invoice.dueDate);
    const now = new Date();
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 h-full overflow-y-auto ${
      darkMode ? 'bg-black' : 'bg-gray-100'
    }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Bosh sahifa', href: '/dashboard' },
          { label: t.payments || 'To\'lovlar' },
        ]}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t.paymentsHistory || 'To\'lovlar tarixi'}
        </h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.viewAndManagePayments || 'To\'lov yozuvlarini ko\'rish va boshqarish'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Payments */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-white border-gray-200'
        }`}>
          <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Payments
          </div>
          <div className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.total}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            UZS {stats.totalAmount.toLocaleString()}
          </div>
        </div>

        {/* Confirmed */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-900 border-green-600/30' : 'bg-white border-green-200'
        }`}>
          <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Confirmed
          </div>
          <div className={`text-2xl font-bold mt-1 text-green-600`}>
            {stats.confirmed}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            UZS {stats.confirmedAmount.toLocaleString()}
          </div>
        </div>

        {/* Pending */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-900 border-yellow-600/30' : 'bg-white border-yellow-200'
        }`}>
          <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Pending
          </div>
          <div className={`text-2xl font-bold mt-1 text-yellow-600`}>
            {stats.pending}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            UZS {stats.pendingAmount.toLocaleString()}
          </div>
        </div>

        {/* Overdue */}
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-gray-900 border-red-600/30' : 'bg-white border-red-200'
        }`}>
          <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Overdue
          </div>
          <div className={`text-2xl font-bold mt-1 text-red-600`}>
            {stats.overdue}
          </div>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Not Paid
          </div>
        </div>
      </div>

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
              placeholder={t.searchByTenantInvoice || 'Ijara oluvchi, hisob-faktura, summa, holat bo\'yicha qidirish...'}
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
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">{t.cancelled || 'Bekor qilingan'}</option>
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
              <option value="ALL">All Methods</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
          <div className="sm:w-40">
            <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${
              darkMode
                ? 'bg-gray-900 border-blue-600/30'
                : 'bg-white border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={overdueFilter}
                onChange={(e) => setOverdueFilter(e.target.checked)}
                className="rounded"
              />
              <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Overdue Only
              </span>
            </label>
          </div>
          
          {/* Record Offline Payment Button */}
          {hasPermission('payments.record_offline') && (
            <button
              onClick={openRecordOfflineModal}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Oflayn to'lov yozish
            </button>
          )}
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
            title={payments.length === 0 ? t.noPayments : t.noResultsFound}
            description={
              payments.length === 0
                ? t.paymentRecordsWillAppear
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
                    Tenant
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Unit
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Invoice
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Amount
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Method / Provider
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.dueDate || 'To\'lov muddati'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Paid At
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}>
                {filteredPayments.map((payment, index) => {
                  const overdue = isOverdue(payment);
                  const daysOverdue = getDaysOverdue(payment);
                  
                  return (
                  <tr
                    key={payment.id}
                    className={`transition-colors ${
                        index % 2 === 0 
                          ? (darkMode ? 'bg-black' : 'bg-white') 
                          : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                        } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'} ${
                          overdue ? (darkMode ? 'border-l-4 border-red-500' : 'border-l-4 border-red-500 bg-red-50') : ''
                        }`}
                  >
                      <td className={`px-6 py-4 whitespace-nowrap ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                        <div className="text-sm font-medium">
                          {payment.tenant?.fullName || (t.notApplicable || 'Mavjud emas')}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {payment.tenant?.phone || payment.tenant?.email || '-'}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        <div className="text-sm font-medium">
                          🏠 {payment.unit?.name || (t.notApplicable || 'Mavjud emas')}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        <div className="text-sm font-medium">
                      {payment.invoiceId}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {payment.invoice?.status || (t.notApplicable || 'Mavjud emas')}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        UZS {payment.amount.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                        <div className="flex items-center gap-1">
                          {payment.method === 'ONLINE' ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                            }`}>
                              Online
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                            }`}>
                              Naqd pul
                            </span>
                          )}
                        </div>
                        {payment.method === 'ONLINE' && payment.status === 'CONFIRMED' && payment.provider && payment.provider !== 'NONE' && (
                          <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {payment.provider}
                          </div>
                        )}
                        {payment.method === 'OFFLINE' && payment.collectedAt && (
                          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(payment.collectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                        )}
                        {payment.method === 'OFFLINE' && payment.collectorNote && (
                          <div className={`text-xs mt-0.5 truncate max-w-[120px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} title={payment.collectorNote}>
                            {payment.collectorNote}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {(() => {
                            // Check if payment was actually received (using helper function)
                            const paymentReceived = isPaymentReceived(payment);
                            // Accept/Decline: for ONLINE PENDING (when received) OR for OFFLINE PENDING (collector added, needs cashier approval)
                            const showButtons = canApprovePayments &&
                                              payment.status === 'PENDING' &&
                                              ((payment.method === 'ONLINE' && paymentReceived) || payment.method === 'OFFLINE');
                            
                            return (
                              <>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${getStatusColor(payment.status, payment)}`}>
                                  {getStatusText(payment.status, payment)}
                                </span>
                                {overdue && (
                                  <div className="text-xs text-red-600 font-semibold">
                                    ⚠️ {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                  </div>
                                )}
                                {/* Accept/Decline buttons - only show when payment was actually received */}
                                {showButtons && (
                                  <div className="flex gap-2 mt-1">
                                    <button 
                                      onClick={() => handleVerifyPayment(payment.id, true)}
                                      disabled={verifyingPaymentId === payment.id}
                                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        verifyingPaymentId === payment.id
                                          ? (darkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                                          : (darkMode 
                                              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30' 
                                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300')
                                      }`}
                                    >
                                      {verifyingPaymentId === payment.id ? 'Processing...' : '✓ Accept'}
                                    </button>
                                    <button 
                                      onClick={() => handleVerifyPayment(payment.id, false)}
                                      disabled={verifyingPaymentId === payment.id}
                                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        verifyingPaymentId === payment.id
                                          ? (darkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                                          : (darkMode 
                                              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30' 
                                              : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300')
                                      }`}
                                    >
                                      ✗ Decline
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                        {payment.invoice?.dueDate ? (
                          <div>
                            <div>{new Date(payment.invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
                            {overdue && (
                              <div className="text-xs text-red-600 font-semibold">
                                Overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>N/A</span>
                        )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                        {payment.paidAt ? (
                          <div>
                            <div>{new Date(payment.paidAt).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(payment.paidAt).toLocaleTimeString()}</div>
                          </div>
                        ) : (
                          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Not paid</span>
                        )}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {canCaptureOffline && payment.status === 'PENDING' && payment.method === 'OFFLINE' && (
                            <button 
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-blue-600 hover:text-blue-900'
                              }`}
                            >
                              Capture
                            </button>
                          )}
                          {/* Edit button - only for PENDING payments */}
                          {canCaptureOffline && payment.status === 'PENDING' && (
                            <button
                              onClick={() => handleOpenEditModal(payment)}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-yellow-600 hover:text-yellow-700'
                              }`}
                              title={t.editPayment || 'To\'lovni tahrirlash'}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {/* Delete button - PENDING/CANCELLED for staff with permission; CONFIRMED only for SUPER_ADMIN */}
                          {((canCaptureOffline && (payment.status === 'PENDING' || payment.status === 'CANCELLED')) || (user?.role === 'SUPER_ADMIN')) && (
                            <button
                              onClick={() => setDeleteConfirmOpen(payment.id)}
                              disabled={deletingPaymentId === payment.id}
                              className={`transition-colors ${
                                deletingPaymentId === payment.id
                                  ? (darkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
                                  : (darkMode
                                      ? 'text-red-400 hover:text-red-300'
                                      : 'text-red-600 hover:text-red-900')
                              }`}
                              title={t.deletePayment || 'To\'lovni o\'chirish'}
                            >
                              {deletingPaymentId === payment.id ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (() => {
        const paymentToDelete = payments.find(p => p.id === deleteConfirmOpen);
        if (!paymentToDelete) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 ${
              darkMode ? 'bg-gray-900 border border-blue-600/30' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Delete Payment
                  </h3>
                  <button
                    onClick={() => setDeleteConfirmOpen(null)}
                    disabled={deletingPaymentId === deleteConfirmOpen}
                    className={`text-gray-400 hover:text-gray-600 ${
                      darkMode ? 'hover:text-gray-300' : ''
                    } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Are you sure you want to delete this payment? This action cannot be undone.
                  </p>

                  <div className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Invoice ID:</span>
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {paymentToDelete.invoiceId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount:</span>
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          UZS {paymentToDelete.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {paymentToDelete.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Method:</span>
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {paymentToDelete.method === 'ONLINE' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirmOpen(null)}
                    disabled={deletingPaymentId === deleteConfirmOpen}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeletePayment(deleteConfirmOpen)}
                    disabled={deletingPaymentId === deleteConfirmOpen}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/50'
                        : 'bg-red-600 text-white hover:bg-red-700 border border-red-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  >
                    {deletingPaymentId === deleteConfirmOpen ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Payment Modal */}
      {editModalOpen && editingPayment && (
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
                  {(t as any).editPayment || t.editPayment || 'To\'lovni tahrirlash'}
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
                {/* Payment Info */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.tenant || 'Tenant'}: <span className="font-medium">{editingPayment.tenant?.fullName || 'N/A'}</span>
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.unit || 'Unit'}: <span className="font-medium">{editingPayment.unit?.name || (t.notApplicable || 'Mavjud emas')}</span>
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.invoiceId || 'Invoice'}: <span className="font-mono text-xs">{editingPayment.invoiceId}</span>
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.method || 'Method'}: <span className="font-medium">{editingPayment.method}</span>
                  </p>
                </div>

                {/* Amount (Read-only for now) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.amount || 'Amount'} (UZS)
                  </label>
                  <input
                    type="text"
                    value={`UZS ${Number(editForm.amount).toLocaleString()}`}
                    disabled
                    className={`block w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-400'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Amount cannot be changed after payment is created
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.status || 'Status'}
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    disabled={savingEdit}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-900 border-blue-600/30 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
                  >
                    <option value="PENDING">{t.pending || 'Pending'}</option>
                    <option value="CONFIRMED">{t.confirmed || 'Confirmed'}</option>
                    <option value="CANCELLED">{t.cancelled || 'Cancelled'}</option>
                  </select>
                </div>

                {/* Warning for status change */}
                {editForm.status === 'CONFIRMED' && editingPayment.status !== 'CONFIRMED' && (
                  <div className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-yellow-900/20 border-yellow-600/30 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  }`}>
                    <p className="text-sm">
                      ⚠️ Changing status to Confirmed will mark the associated invoice as PAID.
                    </p>
                  </div>
                )}

                {editForm.status === 'CANCELLED' && editingPayment.status !== 'CANCELLED' && (
                  <div className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-red-900/20 border-red-600/30 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm">
                      {t.cancelPaymentWarning || 'To\'lovni bekor qilish hisob-faktura holatiga ta\'sir qilmaydi. Hisob-faktura to\'lanmagan bo\'lib qoladi.'}
                    </p>
                  </div>
                )}

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
                    onClick={handleEditPayment}
                    disabled={savingEdit}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {savingEdit ? (t.processing || 'Saqlanmoqda...') : (t.save || 'Saqlash')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record Offline Payment Modal */}
      {recordOfflineModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              if (!recordingOffline) {
                setOfflineInvoiceSearch('');
                setRecordOfflineModalOpen(false);
              }
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-xl shadow-2xl ${
              darkMode ? 'bg-gray-900 border border-blue-600/30' : 'bg-white'
            }`}>
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Oflayn to'lovni yozish
                  </h3>
                  <button
                    onClick={() => {
                      if (!recordingOffline) {
                        setOfflineInvoiceSearch('');
                        setRecordOfflineModalOpen(false);
                      }
                    }}
                    disabled={recordingOffline}
                    className={`p-1 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ijara oluvchidan naqd pul qabul qilinganini yozib qo'ying
                </p>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-red-900/20 border-red-600/30 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Invoice Selection: search + dropdown with tenant/contract/unit */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Hisob-faktura *
                  </label>
                  <input
                    type="text"
                    value={offlineInvoiceSearch}
                    onChange={(e) => setOfflineInvoiceSearch(e.target.value)}
                    placeholder="Ijara oluvchi, shartnoma ID, hisob-faktura ID yoki xona boʻyicha qidirish..."
                    disabled={recordingOffline}
                    className={`w-full px-3 py-2 border rounded-lg mb-2 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <select
                    value={offlineForm.invoiceId}
                    onChange={(e) => {
                      const selectedInvoice = invoices.find(inv => inv.id === e.target.value);
                      setOfflineForm({
                        ...offlineForm,
                        invoiceId: e.target.value,
                        amount: selectedInvoice ? selectedInvoice.amount.toString() : '',
                      });
                    }}
                    disabled={recordingOffline}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Hisob-fakturani tanlang...</option>
                    {offlineFilteredInvoices.map((invoice) => {
                      const tenantName = invoice.contract?.tenant?.fullName || '—';
                      const contractShort = invoice.contract?.id ? `${invoice.contract.id.slice(0, 8)}…` : '—';
                      const unitName = invoice.contract?.unit?.name || '—';
                      const dueStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'N/A';
                      const amountStr = Number(invoice.amount).toLocaleString();
                      const label = `${tenantName} • Shartnoma ${contractShort} • ${unitName} • ${dueStr} • ${amountStr} UZS`;
                      return (
                        <option key={invoice.id} value={invoice.id} title={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {invoices.length === 0 && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      To'lanmagan hisob-fakturalar topilmadi
                    </p>
                  )}
                  {invoices.length > 0 && offlineFilteredInvoices.length === 0 && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                      Qidiruv boʻyicha hech narsa topilmadi. Boshqa soʻz yozib koʻring.
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Miqdor (UZS) *
                  </label>
                  <input
                    type="number"
                    value={offlineForm.amount}
                    onChange={(e) => setOfflineForm({ ...offlineForm, amount: e.target.value })}
                    disabled={recordingOffline}
                    placeholder="100000"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Collector Note */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Izoh (ixtiyoriy)
                  </label>
                  <textarea
                    value={offlineForm.collectorNote}
                    onChange={(e) => setOfflineForm({ ...offlineForm, collectorNote: e.target.value })}
                    disabled={recordingOffline}
                    placeholder="Kvitansiya raqami, qo'shimcha ma'lumot..."
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Info Box */}
                <div className={`p-3 rounded-lg border ${
                  darkMode ? 'bg-blue-900/20 border-blue-600/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <p className="text-sm">
                    ℹ️ Oflayn to'lov darhol tasdiqlangan holda saqlanadi. Hisob-faktura "To'langan" deb belgilanadi.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (!recordingOffline) {
                        setOfflineInvoiceSearch('');
                        setRecordOfflineModalOpen(false);
                      }
                    }}
                    disabled={recordingOffline}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleRecordOfflinePayment}
                    disabled={recordingOffline || !offlineForm.invoiceId || !offlineForm.amount}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                        : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {recordingOffline ? 'Saqlanmoqda...' : 'To\'lovni yozish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
