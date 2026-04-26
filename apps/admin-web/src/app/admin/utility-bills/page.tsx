'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { ApiError, fetchApi } from '../../../lib/api';
import DaritalLoader from '../../../components/DaritalLoader';

type UtilityType = 'WATER' | 'ELECTRICITY' | 'GAS';
type UtilityBillStatus = 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
type PaymentSource = 'BANK' | 'CASH';

interface UtilityBillPayment {
  id: string;
  source: PaymentSource;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  confirmedAt?: string | null;
}

interface UtilityBill {
  id: string;
  tenantId: string;
  tenantName: string | null;
  unitName: string | null;
  type: UtilityType;
  month: string;
  startReading: number | null;
  endReading: number | null;
  consumption: number;
  unitPrice: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: UtilityBillStatus;
  note?: string | null;
  payments: UtilityBillPayment[];
}

interface TenantOption {
  id: string;
  fullName: string;
  phone?: string;
}

const TYPE_LABEL: Record<UtilityType, string> = {
  WATER: 'Suv',
  ELECTRICITY: 'Elektr',
  GAS: 'Gaz',
};

export default function AdminUtilityBillsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);

  const [monthFilter, setMonthFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    tenantId: '',
    type: 'WATER' as UtilityType,
    month: '',
    startReading: '',
    endReading: '',
    unitPrice: '',
    note: '',
  });

  const canRead = hasPermission('utility.bills.read');
  const canRecordPayment = hasPermission('utility.bills.payments.record');
  const canApprovePayment = hasPermission('utility.bills.payments.approve');

  const loadBills = async () => {
    const params = new URLSearchParams();
    if (monthFilter) params.append('month', monthFilter);
    if (typeFilter !== 'ALL') params.append('type', typeFilter);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (search.trim()) params.append('q', search.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchApi<UtilityBill[]>(`/utility-bills${query}`);
    setBills(data);
  };

  const loadTenants = async () => {
    const data = await fetchApi<TenantOption[]>('/tenants');
    setTenants(data);
  };

  const initialLoad = async () => {
    if (!canRead) return;
    setPageLoading(true);
    setError(null);
    try {
      await Promise.all([loadBills(), loadTenants()]);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Kommunal to‘lovlarni yuklashda xatolik yuz berdi');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && canRead) {
      void initialLoad();
    } else if (!loading) {
      setPageLoading(false);
    }
  }, [loading, canRead]);

  useEffect(() => {
    if (!canRead || pageLoading) return;
    const handle = setTimeout(() => {
      void loadBills().catch((err) => setError(err instanceof ApiError ? err.message : 'Yuklashda xatolik'));
    }, 250);
    return () => clearTimeout(handle);
  }, [monthFilter, typeFilter, statusFilter, search]);

  const totals = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        acc.amount += bill.amount;
        acc.paid += bill.paidAmount;
        acc.remaining += bill.remainingAmount;
        return acc;
      },
      { amount: 0, paid: 0, remaining: 0 },
    );
  }, [bills]);

  const handleSaveReading = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.tenantId || !form.month || !form.unitPrice) {
      setError('Tenant, oy va tarif majburiy');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchApi('/utility-bills/readings/upsert', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startReading: form.startReading || undefined,
          endReading: form.endReading || undefined,
        }),
      });
      setForm((prev) => ({ ...prev, startReading: '', endReading: '', note: '' }));
      await loadBills();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (billId: string) => {
    const sourceRaw = window.prompt('To‘lov manbasi kiriting: BANK yoki CASH', 'BANK');
    if (!sourceRaw) return;
    const source = sourceRaw.toUpperCase();
    if (source !== 'BANK' && source !== 'CASH') {
      setError('Faqat BANK yoki CASH manbasi ruxsat etiladi');
      return;
    }
    const amount = window.prompt('To‘lov summasi (bo‘sh qoldirilsa to‘liq qoldiq):', '');
    try {
      await fetchApi(`/utility-bills/${billId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          source,
          amount: amount?.trim() ? amount.trim() : undefined,
        }),
      });
      await loadBills();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'To‘lov yozishda xatolik');
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      await fetchApi(`/utility-bills/payments/${paymentId}/approve`, { method: 'PATCH' });
      await loadBills();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tasdiqlashda xatolik');
    }
  };

  const handleDecline = async (paymentId: string) => {
    try {
      await fetchApi(`/utility-bills/payments/${paymentId}/decline`, { method: 'PATCH' });
      await loadBills();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rad etishda xatolik');
    }
  };

  if (loading || pageLoading) return <DaritalLoader darkMode={darkMode} />;
  if (!user || !canRead) return <NoAccess />;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-100'}`}>
      <Breadcrumbs items={[{ label: t.dashboard || 'Bosh sahifa', href: '/dashboard' }, { label: 'Kommunal to‘lovlar' }]} />

      <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Kommunal to‘lovlar</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Suv, elektr va gaz hisoblagichlari bo‘yicha oylik billing va to‘lov nazorati
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border bg-red-100 border-red-300 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-200'}`}>
          <p className="text-xs opacity-70">Umumiy hisob</p>
          <p className="text-xl font-semibold mt-1">UZS {Math.round(totals.amount).toLocaleString()}</p>
        </div>
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-green-600/30 text-white' : 'bg-white border-green-200'}`}>
          <p className="text-xs opacity-70">To‘langan</p>
          <p className="text-xl font-semibold mt-1">UZS {Math.round(totals.paid).toLocaleString()}</p>
        </div>
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-amber-600/30 text-white' : 'bg-white border-amber-200'}`}>
          <p className="text-xs opacity-70">Qolgan qarzdorlik</p>
          <p className="text-xl font-semibold mt-1">UZS {Math.round(totals.remaining).toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleSaveReading} className={`mb-6 rounded-lg border p-4 ${darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-white border-gray-200'}`}>
        <p className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Oylik hisoblagich kiriting / yangilang</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={form.tenantId}
            onChange={(e) => setForm((prev) => ({ ...prev, tenantId: e.target.value }))}
            className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
            required
          >
            <option value="">Tenant tanlang</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.fullName} {tenant.phone ? `(${tenant.phone})` : ''}
              </option>
            ))}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as UtilityType }))}
            className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="WATER">Suv</option>
            <option value="ELECTRICITY">Elektr</option>
            <option value="GAS">Gaz</option>
          </select>
          <input
            type="month"
            value={form.month}
            onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
            className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Tarif (1 birlik)"
            value={form.unitPrice}
            onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
            className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Boshlang‘ich ko‘rsatkich"
            value={form.startReading}
            onChange={(e) => setForm((prev) => ({ ...prev, startReading: e.target.value }))}
            className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Oxirgi ko‘rsatkich"
            value={form.endReading}
            onChange={(e) => setForm((prev) => ({ ...prev, endReading: e.target.value }))}
            className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
          />
          <input
            type="text"
            placeholder="Izoh (ixtiyoriy)"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            className={`px-3 py-2 rounded-lg border md:col-span-2 ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
          />
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-50`}
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tenant / xona qidirish"
          className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
        />
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
        >
          <option value="ALL">Barcha turlar</option>
          <option value="WATER">Suv</option>
          <option value="ELECTRICITY">Elektr</option>
          <option value="GAS">Gaz</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
        >
          <option value="ALL">Barcha holatlar</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIALLY_PAID">Partially paid</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon={<div className="text-4xl">💡</div>}
          title="Kommunal hisoblar yo‘q"
          description="Yuqoridagi forma orqali oy bo‘yicha ko‘rsatkichlarni kiriting"
        />
      ) : (
        <div className="grid gap-4">
          {bills.map((bill) => (
            <div key={bill.id} className={`rounded-lg border p-4 ${darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {bill.tenantName || 'Tenant'} • {bill.unitName || 'Unit'}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {TYPE_LABEL[bill.type]} • {bill.month}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>UZS {Math.round(bill.amount).toLocaleString()}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Qoldiq: UZS {Math.round(bill.remainingAmount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className={`mt-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Boshlang‘ich: {bill.startReading ?? '-'} • Oxirgi: {bill.endReading ?? '-'} • Sarf: {bill.consumption.toLocaleString()} • Tarif: {bill.unitPrice.toLocaleString()}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  bill.status === 'PAID'
                    ? 'bg-green-100 text-green-800'
                    : bill.status === 'PARTIALLY_PAID'
                      ? 'bg-amber-100 text-amber-800'
                      : bill.status === 'PENDING'
                        ? 'bg-blue-100 text-blue-800'
                        : bill.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-700'
                }`}>
                  {bill.status}
                </span>
                {canRecordPayment && bill.remainingAmount > 0 && (
                  <button
                    onClick={() => handleRecordPayment(bill.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${darkMode ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}
                  >
                    To‘lov yozish
                  </button>
                )}
              </div>

              {bill.payments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {bill.payments.map((payment) => (
                    <div key={payment.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${darkMode ? 'border-blue-600/30 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-sm">
                        <span className="font-medium">{payment.source}</span> • UZS {Math.round(payment.amount).toLocaleString()} • {payment.status}
                      </div>
                      {canApprovePayment && payment.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(payment.id)} className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Tasdiqlash</button>
                          <button onClick={() => handleDecline(payment.id)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Rad etish</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
