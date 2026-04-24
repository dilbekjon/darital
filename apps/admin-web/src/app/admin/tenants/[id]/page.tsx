'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUntypedTranslations } from '../../../../i18n/useUntypedTranslations';
import { fetchApi, ApiError, normalizeListResponse } from '../../../../lib/api';
import DaritalLoader from '../../../../components/DaritalLoader';
import { NoAccess } from '../../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';

interface Tenant {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  createdAt: string;
  isArchived?: boolean;
}

interface Contract {
  id: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  status: string;
  amount: number;
  bankAmount?: number;
  cashAmount?: number;
  unit?: { id?: string; name?: string; buildingName?: string };
}

interface InvoicePayment {
  id: string;
  status: string;
  amount: number;
  source?: 'BANK' | 'CASH' | 'ONLINE' | null;
}

interface Invoice {
  id: string;
  contractId: string;
  dueDate: string;
  amount: number;
  bankAmount?: number;
  cashAmount?: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  payments?: InvoicePayment[];
  contract?: {
    id: string;
    unit?: { name?: string };
  };
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  status: string;
  method: string;
  source?: string;
  createdAt: string;
  paidAt?: string | null;
  tenantConfirmedAt?: string | null;
  tenantConfirmedAmount?: number | null;
  collectorReceivedAmount?: number | null;
  collectedAt?: string | null;
  cashCustody?: {
    status?: string;
    differenceBetweenTenantAndCollector?: number | null;
  };
  invoice?: {
    id: string;
    status: string;
    dueDate?: string | null;
  };
}

export default function AdminTenantDetailsPage() {
  const params = useParams<{ id: string }>();
  const tenantId = String(params?.id || '');
  const router = useRouter();
  const { user, loading, hasPermission } = useAuth();
  const { darkMode } = useTheme();
  const t = useUntypedTranslations();

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments'>('overview');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  const displayPhone = (phone?: string) => {
    if (!phone) return '';
    const trimmed = phone.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  };

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('tenants.read')) {
        setPageLoading(false);
        return;
      }
      if (!tenantId) {
        setError('Tenant ID topilmadi');
        setPageLoading(false);
        return;
      }

      const load = async () => {
        try {
          setPageLoading(true);
          setError(null);
          const [tenantData, contractsData, invoicesData, paymentsData] = await Promise.all([
            fetchApi<Tenant>(`/tenants/${tenantId}`),
            fetchApi<Contract[]>(`/contracts?includeArchived=true`),
            fetchApi<any>(`/invoices?tenantId=${tenantId}&includeArchived=true&limit=500`),
            fetchApi<any>(`/payments?tenantId=${tenantId}&includeArchived=true&limit=500`),
          ]);

          setTenant(tenantData);
          setContracts((contractsData || []).filter((c) => c.tenantId === tenantId));
          setInvoices(normalizeListResponse<Invoice>(invoicesData).items || []);
          setPayments(normalizeListResponse<Payment>(paymentsData).items || []);
        } catch (err) {
          console.error('Failed to load tenant details:', err);
          if (err instanceof ApiError) setError(err.message);
          else setError('Ma’lumotlarni yuklashda xatolik yuz berdi');
        } finally {
          setPageLoading(false);
        }
      };

      load();
    }
  }, [loading, user, hasPermission, tenantId]);

  const stats = useMemo(() => {
    const confirmedPayments = payments.filter((p) => p.status === 'CONFIRMED');
    const totalPaid = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE').length;
    const paidInvoices = invoices.filter((i) => i.status === 'PAID').length;
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;

    return {
      contracts: contracts.length,
      activeContracts,
      invoices: invoices.length,
      paidInvoices,
      overdueInvoices,
      payments: payments.length,
      totalPaid,
    };
  }, [contracts, invoices, payments]);

  const financeOverview = useMemo(() => {
    const monthMap = new Map<string, {
      month: string;
      monthLabel: string;
      invoiceCount: number;
      totalDue: number;
      totalPaid: number;
      totalRemaining: number;
      bankDue: number;
      bankPaid: number;
      bankRemaining: number;
      cashDue: number;
      cashPaid: number;
      cashRemaining: number;
    }>();

    let totalDue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueRemaining = 0;
    const now = new Date();

    for (const invoice of invoices) {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const monthKey = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`
        : 'N/A';
      const monthLabel = dueDate
        ? dueDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })
        : 'Noma’lum oy';

      const invoiceTotal = Number(invoice.amount || 0);
      const bankDue = Number(invoice.bankAmount ?? invoice.amount ?? 0);
      const cashDue = Number(invoice.cashAmount ?? 0);

      const confirmedPayments = (invoice.payments || []).filter((payment) => payment.status === 'CONFIRMED');
      const invoicePaid = confirmedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const invoiceRemaining = Math.max(0, invoiceTotal - invoicePaid);

      const bankPaid = confirmedPayments
        .filter((payment) => {
          const source = String(payment.source || '').toUpperCase();
          return source === 'BANK' || source === 'ONLINE';
        })
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const cashPaid = confirmedPayments
        .filter((payment) => String(payment.source || '').toUpperCase() === 'CASH')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const bankRemaining = Math.max(0, bankDue - bankPaid);
      const cashRemaining = Math.max(0, cashDue - cashPaid);

      const row = monthMap.get(monthKey) || {
        month: monthKey,
        monthLabel,
        invoiceCount: 0,
        totalDue: 0,
        totalPaid: 0,
        totalRemaining: 0,
        bankDue: 0,
        bankPaid: 0,
        bankRemaining: 0,
        cashDue: 0,
        cashPaid: 0,
        cashRemaining: 0,
      };

      row.invoiceCount += 1;
      row.totalDue += invoiceTotal;
      row.totalPaid += invoicePaid;
      row.totalRemaining += invoiceRemaining;
      row.bankDue += bankDue;
      row.bankPaid += bankPaid;
      row.bankRemaining += bankRemaining;
      row.cashDue += cashDue;
      row.cashPaid += cashPaid;
      row.cashRemaining += cashRemaining;

      monthMap.set(monthKey, row);

      totalDue += invoiceTotal;
      totalPaid += invoicePaid;
      totalRemaining += invoiceRemaining;

      if (dueDate && dueDate < now && invoiceRemaining > 0) {
        overdueRemaining += invoiceRemaining;
      }
    }

    const months = Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));

    return {
      totalDue,
      totalPaid,
      totalRemaining,
      overdueRemaining,
      months,
    };
  }, [invoices]);

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [invoices],
  );

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [payments],
  );

  const getSplitProgress = (invoice: Invoice, source: 'BANK' | 'CASH') => {
    const due = source === 'BANK'
      ? Number(invoice.bankAmount ?? invoice.amount ?? 0)
      : Number(invoice.cashAmount ?? 0);
    const paid = (invoice.payments || [])
      .filter((payment) => {
        if (payment.status !== 'CONFIRMED') return false;
        const value = String(payment.source || '').toUpperCase();
        if (source === 'BANK') return value === 'BANK' || value === 'ONLINE';
        return value === 'CASH';
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const percent = due > 0 ? Math.min(100, (paid / due) * 100) : 100;
    return { due, paid, percent };
  };

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('tenants.read')) {
    return <NoAccess />;
  }

  if (!tenant) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-100'}`}>
        <button
          onClick={() => router.push('/admin/tenants')}
          className={`mb-4 px-4 py-2 rounded-lg ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          ← Orqaga
        </button>
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-700'}`}>
          {error || 'Ijara oluvchi topilmadi'}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-100'}`}>
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Bosh sahifa', href: '/dashboard' },
          { label: t.tenants || 'Ijara oluvchilar', href: '/admin/tenants' },
          { label: tenant.fullName },
        ]}
      />

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {tenant.fullName}
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {displayPhone(tenant.phone)} {tenant.email ? `• ${tenant.email}` : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/tenants')}
          className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
        >
          ← Ijara oluvchilar
        </button>
      </div>

      {error && (
        <div className={`mb-4 rounded-lg p-3 ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-700'}`}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Shartnomalar</div>
          <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.contracts}</div>
        </div>
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Faol</div>
          <div className={`text-xl font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{stats.activeContracts}</div>
        </div>
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hisob-fakturalar</div>
          <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.invoices}</div>
        </div>
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>To‘langan</div>
          <div className={`text-xl font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{stats.paidInvoices}</div>
        </div>
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Muddati o‘tgan</div>
          <div className={`text-xl font-semibold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>{stats.overdueInvoices}</div>
        </div>
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>To‘lovlar</div>
          <div className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.payments}</div>
        </div>
        <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Jami to‘langan</div>
          <div className={`text-sm font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{formatCurrency(stats.totalPaid)}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: 'overview', label: 'Umumiy' },
          { key: 'invoices', label: 'Hisob-fakturalar' },
          { key: 'payments', label: 'To‘lovlar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-900 text-gray-300 border border-gray-700'
                  : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h2 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Shartnomalar / Xonalar</h2>
            {contracts.length === 0 ? (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Shartnoma topilmadi</p>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <div key={contract.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {contract.unit?.buildingName ? `${contract.unit.buildingName} • ` : ''}{contract.unit?.name || 'Xona'}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(contract.startDate).toLocaleDateString('en-GB')} - {new Date(contract.endDate).toLocaleDateString('en-GB')}
                    </div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Oylik: {formatCurrency(contract.amount)} (Bank {formatCurrency(contract.bankAmount || 0)}, Naqd {formatCurrency(contract.cashAmount || 0)})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h2 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Oxirgi to‘lovlar</h2>
            {sortedPayments.length === 0 ? (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>To‘lovlar yo‘q</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {sortedPayments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(payment.amount)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {payment.source || payment.method} • {new Date(payment.createdAt).toLocaleString('en-GB')}
                    </div>
                    {payment.method === 'OFFLINE' && payment.source === 'CASH' && (
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {payment.cashCustody?.status || 'CASH'} • tenant {payment.tenantConfirmedAmount ? formatCurrency(payment.tenantConfirmedAmount) : '-'} • collector {payment.collectorReceivedAmount ? formatCurrency(payment.collectorReceivedAmount) : '-'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`lg:col-span-2 rounded-lg p-4 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Moliyaviy umumiy holat
              </h2>
              <button
                onClick={() => router.push(`/admin/payments?action=add-payment&tenantId=${tenant.id}`)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                To‘lov qo‘shish
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Jami to‘lanishi kerak</div>
                <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(financeOverview.totalDue)}</div>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Jami to‘langan</div>
                <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{formatCurrency(financeOverview.totalPaid)}</div>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Jami qoldiq</div>
                <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>{formatCurrency(financeOverview.totalRemaining)}</div>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Muddati o‘tgan qarz</div>
                <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{formatCurrency(financeOverview.overdueRemaining)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <th className="py-2 text-left">Oy</th>
                    <th className="py-2 text-left">Invoice</th>
                    <th className="py-2 text-left">Jami</th>
                    <th className="py-2 text-left">To‘langan</th>
                    <th className="py-2 text-left">Qolgan</th>
                    <th className="py-2 text-left">Bank (qoldiq)</th>
                    <th className="py-2 text-left">Naqd (qoldiq)</th>
                  </tr>
                </thead>
                <tbody>
                  {financeOverview.months.map((month) => (
                    <tr key={month.month} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <td className="py-2">{month.monthLabel}</td>
                      <td className="py-2">{month.invoiceCount}</td>
                      <td className="py-2">{formatCurrency(month.totalDue)}</td>
                      <td className="py-2">{formatCurrency(month.totalPaid)}</td>
                      <td className="py-2 font-semibold">{formatCurrency(month.totalRemaining)}</td>
                      <td className="py-2">{formatCurrency(month.bankRemaining)}</td>
                      <td className="py-2">{formatCurrency(month.cashRemaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {financeOverview.months.length === 0 && (
                <p className={`py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Moliyaviy ma’lumot topilmadi
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Hisob-fakturalar tarixi</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <th className="py-2 text-left">Muddat</th>
                  <th className="py-2 text-left">Xona</th>
                  <th className="py-2 text-left">Jami</th>
                  <th className="py-2 text-left">Bank / Naqd progress</th>
                  <th className="py-2 text-left">Holat</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((invoice) => {
                  const bank = getSplitProgress(invoice, 'BANK');
                  const cash = getSplitProgress(invoice, 'CASH');
                  return (
                    <tr key={invoice.id} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <td className="py-3">{new Date(invoice.dueDate).toLocaleDateString('en-GB')}</td>
                      <td className="py-3">{invoice.contract?.unit?.name || '-'}</td>
                      <td className="py-3">{formatCurrency(invoice.amount)}</td>
                      <td className="py-3 min-w-[260px]">
                        <div className="space-y-1">
                          <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Bank: {formatCurrency(bank.paid)} / {formatCurrency(bank.due)}
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className={`h-full ${bank.percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${bank.percent}%` }} />
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Naqd: {formatCurrency(cash.paid)} / {formatCurrency(cash.due)}
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className={`h-full ${cash.percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${cash.percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>To‘lovlar tarixi</h2>
            {hasPermission('payments.record_offline') && (
              <button
                onClick={() => router.push(`/admin/payments?action=add-payment&tenantId=${tenant.id}`)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                To‘lov qo‘shish
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <th className="py-2 text-left">Sana</th>
                  <th className="py-2 text-left">Invoice</th>
                  <th className="py-2 text-left">Miqdor</th>
                  <th className="py-2 text-left">Manba</th>
                  <th className="py-2 text-left">Kassa holati</th>
                  <th className="py-2 text-left">Holat</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((payment) => (
                  <tr key={payment.id} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <td className="py-3">{new Date(payment.createdAt).toLocaleString('en-GB')}</td>
                    <td className="py-3">{payment.invoiceId}</td>
                    <td className="py-3">{formatCurrency(payment.amount)}</td>
                    <td className="py-3">{payment.source || payment.method}</td>
                    <td className="py-3">
                      {payment.method === 'OFFLINE' && payment.source === 'CASH' ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">{payment.cashCustody?.status || '-'}</div>
                          <div className="text-xs opacity-80">
                            Tenant: {payment.tenantConfirmedAmount ? formatCurrency(payment.tenantConfirmedAmount) : '-'}
                          </div>
                          <div className="text-xs opacity-80">
                            Yig‘uvchi: {payment.collectorReceivedAmount ? formatCurrency(payment.collectorReceivedAmount) : '-'}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
