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
type WorkflowStatus = 'TENANT_SUBMITTED' | 'COLLECTOR_CONFIRMED' | 'HANDED_TO_CASHIER' | 'CASHIER_CONFIRMED' | 'REJECTED';

interface UtilityBillPayment {
  id: string;
  utilityType: UtilityType;
  source: PaymentSource;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  workflowStatus: WorkflowStatus;
  tenantDeclaredAmount?: number | null;
  collectorConfirmedAmount?: number | null;
  collectorId?: string | null;
  tenantDeclaredAt?: string | null;
  collectorConfirmedAt?: string | null;
  collectorHandoverAt?: string | null;
  handoverDueAt?: string | null;
  handoverOverdue?: boolean;
  note?: string | null;
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
  ELECTRICITY: 'Svet',
  GAS: 'Gaz',
};

const WORKFLOW_LABEL: Record<WorkflowStatus, string> = {
  TENANT_SUBMITTED: 'Tenant yubordi',
  COLLECTOR_CONFIRMED: 'Yig‘uvchi qabul qildi',
  HANDED_TO_CASHIER: 'Kassirga topshirildi',
  CASHIER_CONFIRMED: 'Kassir tasdiqladi',
  REJECTED: 'Rad etildi',
};

const collectorRoleByType: Record<UtilityType, string[]> = {
  WATER: ['WATER_COLLECTOR', 'PAYMENT_COLLECTOR'],
  ELECTRICITY: ['ELECTRICITY_COLLECTOR', 'PAYMENT_COLLECTOR'],
  GAS: ['GAS_COLLECTOR', 'PAYMENT_COLLECTOR'],
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
  const [activeType, setActiveType] = useState<UtilityType>('WATER');

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
  const isCashier = user?.role === 'CASHIER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const canManageReading = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'WATER_OPERATOR' || user?.role === 'ELECTRICITY_OPERATOR' || user?.role === 'GAS_OPERATOR';

  const canCollectForType = (type: UtilityType) => {
    const role = user?.role || '';
    return collectorRoleByType[type].includes(role) || role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'CASHIER';
  };

  const loadBills = async () => {
    const data = await fetchApi<UtilityBill[]>('/utility-bills');
    setBills(data);
  };

  const loadTenants = async () => {
    const data = await fetchApi<TenantOption[]>('/tenants');
    setTenants(data);
  };

  useEffect(() => {
    const run = async () => {
      if (!canRead) {
        setPageLoading(false);
        return;
      }
      setPageLoading(true);
      setError(null);
      try {
        await Promise.all([loadBills(), loadTenants()]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Kommunal ma’lumotlarni yuklashda xatolik');
      } finally {
        setPageLoading(false);
      }
    };
    if (!loading) void run();
  }, [loading, canRead]);

  const groupedBills = useMemo(() => bills.filter((bill) => bill.type === activeType), [bills, activeType]);

  const queue = useMemo(() => {
    const rows: Array<{ bill: UtilityBill; payment: UtilityBillPayment }> = [];
    for (const bill of bills) {
      if (bill.type !== activeType) continue;
      for (const payment of bill.payments) {
        if (payment.status !== 'PENDING') continue;
        rows.push({ bill, payment });
      }
    }
    rows.sort((a, b) => new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime());
    return rows;
  }, [bills, activeType]);

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
      setError(err instanceof ApiError ? err.message : 'Hisob saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleCollectorConfirm = async (paymentId: string, suggestedAmount: number) => {
    const raw = window.prompt('Qabul qilingan summa', String(Math.round(suggestedAmount)));
    if (raw === null) return;
    try {
      await fetchApi(`/utility-bills/payments/${paymentId}/collector-confirm`, {
        method: 'PATCH',
        body: JSON.stringify(raw.trim() ? { amount: raw.trim() } : {}),
      });
      await loadBills();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Qabul qilishda xatolik');
    }
  };

  const handleCollectorHandover = async (paymentId: string) => {
    try {
      await fetchApi(`/utility-bills/payments/${paymentId}/collector-handover`, { method: 'PATCH' });
      await loadBills();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kassirga topshirishda xatolik');
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

      <div className="mb-4">
        <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Kommunal to‘lovlar</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Model: Tenant yuboradi → Yig‘uvchi qabul qiladi → Kassirga topshiradi → Kassir tasdiqlaydi
        </p>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg border bg-red-100 border-red-300 text-red-700">{error}</div>}

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABEL) as UtilityType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveType(type);
              setForm((prev) => ({ ...prev, type }));
            }}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${
              activeType === type
                ? darkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-900 text-gray-300 border border-blue-600/20'
                  : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      {canManageReading && (
        <form onSubmit={handleSaveReading} className={`mb-6 rounded-xl border p-4 ${darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-white border-gray-200'}`}>
          <p className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Oy boshidagi/oxiridagi hisoblagich</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              placeholder="Tarif"
              value={form.unitPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
              className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Boshlang‘ich holat"
              value={form.startReading}
              onChange={(e) => setForm((prev) => ({ ...prev, startReading: e.target.value }))}
              className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Oxirgi holat"
              value={form.endReading}
              onChange={(e) => setForm((prev) => ({ ...prev, endReading: e.target.value }))}
              className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
            />
            <input
              type="text"
              placeholder="Izoh"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`mt-3 px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-50`}
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      )}

      <div className={`mb-6 rounded-xl border p-4 ${darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-white border-gray-200'}`}>
        <p className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {TYPE_LABEL[activeType]} bo‘yicha to‘lov navbati
        </p>
        {queue.length === 0 ? (
          <p className={darkMode ? 'text-sm text-gray-400' : 'text-sm text-gray-600'}>Kutilayotgan to‘lov yo‘q.</p>
        ) : (
          <div className="space-y-2">
            {queue.map(({ bill, payment }) => {
              const canCollect = canCollectForType(payment.utilityType);
              const allowCollectorConfirm = canCollect && payment.source === 'CASH' && payment.workflowStatus === 'TENANT_SUBMITTED';
              const allowCollectorHandover =
                canCollect &&
                payment.source === 'CASH' &&
                payment.workflowStatus === 'COLLECTOR_CONFIRMED' &&
                (!payment.collectorId || payment.collectorId === user.id || isCashier);
              const allowCashierApprove =
                isCashier &&
                payment.status === 'PENDING' &&
                (
                  (payment.source === 'BANK' && payment.workflowStatus === 'TENANT_SUBMITTED') ||
                  (payment.source === 'CASH' && payment.workflowStatus === 'HANDED_TO_CASHIER')
                );

              return (
                <div key={payment.id} className={`rounded-lg border px-3 py-3 ${darkMode ? 'border-blue-600/30 bg-black' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {bill.tenantName || 'Tenant'} • {bill.unitName || 'Unit'}
                      </p>
                      <p className={darkMode ? 'text-xs text-gray-400' : 'text-xs text-gray-600'}>
                        {TYPE_LABEL[bill.type]} • {payment.source} • {Math.round(payment.amount).toLocaleString()} UZS
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{WORKFLOW_LABEL[payment.workflowStatus]}</p>
                      {payment.handoverOverdue && (
                        <p className="text-[11px] text-red-500 font-semibold">Kassirga topshirish kechikdi</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allowCollectorConfirm && (
                      <button
                        onClick={() => handleCollectorConfirm(payment.id, payment.tenantDeclaredAmount ?? payment.amount)}
                        className={darkMode ? 'px-3 py-1 rounded text-xs bg-amber-600/20 border border-amber-600/30 text-amber-200' : 'px-3 py-1 rounded text-xs bg-amber-100 border border-amber-300 text-amber-800'}
                      >
                        Qabul qildim
                      </button>
                    )}
                    {allowCollectorHandover && (
                      <button
                        onClick={() => handleCollectorHandover(payment.id)}
                        className={darkMode ? 'px-3 py-1 rounded text-xs bg-blue-600/20 border border-blue-600/30 text-blue-200' : 'px-3 py-1 rounded text-xs bg-blue-100 border border-blue-300 text-blue-800'}
                      >
                        Kassirga topshirdim
                      </button>
                    )}
                    {allowCashierApprove && (
                      <>
                        <button onClick={() => handleApprove(payment.id)} className="px-3 py-1 rounded text-xs bg-green-100 border border-green-300 text-green-800">
                          Tasdiqlash
                        </button>
                        <button onClick={() => handleDecline(payment.id)} className="px-3 py-1 rounded text-xs bg-red-100 border border-red-300 text-red-700">
                          Rad etish
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {groupedBills.length === 0 ? (
        <EmptyState
          icon={<div className="text-4xl">💡</div>}
          title={`${TYPE_LABEL[activeType]} bo‘yicha hisob yo‘q`}
          description="Oy bo‘yicha hisoblagich kiritsangiz, tenantlar shu yerdan to‘lov qiladi."
        />
      ) : (
        <div className="grid gap-4">
          {groupedBills.map((bill) => (
            <div key={bill.id} className={`rounded-xl border p-4 ${darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {bill.tenantName || 'Tenant'} • {bill.unitName || 'Unit'}
                  </p>
                  <p className={darkMode ? 'text-xs text-gray-400' : 'text-xs text-gray-600'}>
                    {TYPE_LABEL[bill.type]} • {bill.month}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{Math.round(bill.amount).toLocaleString()} UZS</p>
                  <p className={darkMode ? 'text-xs text-gray-400' : 'text-xs text-gray-600'}>Qoldiq: {Math.round(bill.remainingAmount).toLocaleString()} UZS</p>
                </div>
              </div>
              <p className={darkMode ? 'mt-2 text-xs text-gray-400' : 'mt-2 text-xs text-gray-600'}>
                Holat: {bill.startReading ?? '-'} → {bill.endReading ?? '-'} • Sarf: {bill.consumption.toLocaleString()} • Tarif: {bill.unitPrice.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
