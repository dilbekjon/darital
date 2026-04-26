'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmTenantCashGiven, getTenantPayments } from '../../../lib/tenantApi';
import { ApiError, fetchTenantApi } from '../../../lib/api';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';
import ReceiptDownload from '../../../components/ReceiptDownload';

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [cashAmounts, setCashAmounts] = useState<Record<string, string>>({});
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const router = useRouter();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  const parseMoneyInput = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\s+/g, '').replace(/,/g, '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setPayments(await getTenantPayments());
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const reloadPayments = async () => {
    setPayments(await getTenantPayments());
  };

  const sortedPayments = useMemo(() => {
    const statusPriority: Record<string, number> = { PENDING: 0, CANCELLED: 1, CONFIRMED: 2 };
    return [...payments].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [payments]);

  const handleDownloadReceipt = async (paymentId: string) => {
    setLoadingReceipt(paymentId);
    try {
      const data = await fetchTenantApi(`/tenant/receipts/payment/${paymentId}`);
      setReceiptData(data);
    } catch {
      alert(t.receiptError || 'Chekni yuklab bo‘lmadi');
    } finally {
      setLoadingReceipt(null);
    }
  };

  const getSourceLabel = (payment: any) => {
    if (payment.source === 'BANK') return 'Bank';
    if (payment.source === 'CASH') return 'Naqd';
    return payment.method === 'OFFLINE' ? 'Naqd' : 'Online';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'CONFIRMED') return t.confirmed;
    if (status === 'PENDING') return t.pending;
    if (status === 'CANCELLED') return 'Bekor qilingan';
    return status;
  };

  const getCustodyText = (payment: any) => {
    switch (payment.custodyStatus) {
      case 'AWAITING_TENANT_CONFIRMATION':
        return '1-qadam: bergan summani tasdiqlang.';
      case 'DECLARED_BY_TENANT':
        return '2-qadam: to‘lov yig‘uvchi olganini tasdiqlaydi.';
      case 'WITH_COLLECTOR':
        return '3-qadam: kassir kompaniyaga qabul qiladi.';
      case 'DISPUTED':
        return 'Summada tafovut bor, kassir tekshiradi.';
      case 'RECEIVED_BY_COMPANY':
        return 'To‘lov kompaniya hisobiga qabul qilingan.';
      default:
        return 'Holat kutilmoqda.';
    }
  };

  const handleConfirmCashGiven = async (paymentId: string) => {
    const payment = payments.find((item) => item.id === paymentId);
    const fallbackAmount = payment?.tenantConfirmedAmount ?? payment?.amount ?? null;
    const rawAmount = String(cashAmounts[paymentId] ?? (fallbackAmount != null ? String(fallbackAmount) : '')).trim();
    const parsedAmount = parseMoneyInput(rawAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Summani to‘g‘ri kiriting');
      return;
    }
    const amount = String(parsedAmount);

    setConfirmingPaymentId(paymentId);
    try {
      await confirmTenantCashGiven(paymentId, amount);
      await reloadPayments();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Tasdiqlashda xatolik yuz berdi');
      }
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  if (loading) return <DaritalLoader darkMode={darkMode} />;

  const pendingPayments = sortedPayments.filter((payment) => payment.status === 'PENDING');
  const confirmedPayments = sortedPayments.filter((payment) => payment.status === 'CONFIRMED');

  return (
    <>
      <TenantNavbar />
      <div className={darkMode ? 'min-h-screen bg-black text-white' : 'min-h-screen bg-slate-50 text-slate-900'}>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold">{t.paymentsHistory}</h1>
            <p className={darkMode ? 'mt-2 text-sm text-slate-400' : 'mt-2 text-sm text-slate-600'}>
              Bu bo‘lim to‘lov operatsiyalari tarixi uchun. Invoice bo‘limida qarzdorlik ko‘rinadi.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={darkMode ? 'rounded-2xl border border-yellow-700/40 bg-yellow-900/20 p-4' : 'rounded-2xl border border-yellow-200 bg-yellow-50 p-4'}>
              <p className={darkMode ? 'text-xs text-slate-300' : 'text-xs text-slate-600'}>Kutilayotgan to‘lovlar</p>
              <p className="mt-1 text-2xl font-semibold">{pendingPayments.length}</p>
            </div>
            <div className={darkMode ? 'rounded-2xl border border-green-700/40 bg-green-900/20 p-4' : 'rounded-2xl border border-green-200 bg-green-50 p-4'}>
              <p className={darkMode ? 'text-xs text-slate-300' : 'text-xs text-slate-600'}>Tasdiqlangan to‘lovlar</p>
              <p className="mt-1 text-2xl font-semibold">{confirmedPayments.length}</p>
            </div>
          </div>

          <div className={darkMode ? 'mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4' : 'mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4'}>
            <p className="text-sm">
              Naqd to‘lovlarda jarayon: tenant tasdiqlaydi → to‘lov yig‘uvchi tasdiqlaydi → kassir yakuniy tasdiq beradi.
            </p>
          </div>

          {sortedPayments.length === 0 ? (
            <div className={darkMode ? 'rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400' : 'rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500'}>
              {t.noPayments}
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className={darkMode ? 'rounded-2xl border border-slate-800 bg-slate-950 p-5' : 'rounded-2xl border border-slate-200 bg-white p-5'}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{payment.unitName || 'Xona'}</p>
                      <p className={darkMode ? 'mt-1 text-sm text-slate-400' : 'mt-1 text-sm text-slate-500'}>
                        Invoice: {String(payment.invoiceId).slice(0, 12)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{Number(payment.amount).toLocaleString()} UZS</p>
                      <p className={darkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('uz-UZ') : new Date(payment.createdAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={darkMode ? 'rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200' : 'rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700'}>
                      {getSourceLabel(payment)}
                    </span>
                    <span className={payment.status === 'CONFIRMED'
                      ? darkMode ? 'rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-300' : 'rounded-full bg-green-100 px-3 py-1 text-xs text-green-700'
                      : payment.status === 'PENDING'
                        ? darkMode ? 'rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300' : 'rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700'
                        : darkMode ? 'rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300' : 'rounded-full bg-red-100 px-3 py-1 text-xs text-red-700'}>
                      {getStatusLabel(payment.status)}
                    </span>
                  </div>

                  {payment.status === 'PENDING' && (
                    <div className="mt-4 space-y-2">
                      <p className={darkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-600'}>
                        {getCustodyText(payment)}
                      </p>
                      {payment.method === 'OFFLINE' && payment.source === 'CASH' && !payment.tenantConfirmedAt && (
                        <div className="space-y-2">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={cashAmounts[payment.id] ?? String(payment.amount ?? '')}
                            onChange={(e) => setCashAmounts((prev) => ({ ...prev, [payment.id]: e.target.value }))}
                            placeholder="Bergan summangiz"
                            className={darkMode
                              ? 'w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white'
                              : 'w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900'}
                          />
                          <button
                            onClick={() => handleConfirmCashGiven(payment.id)}
                            disabled={confirmingPaymentId === payment.id}
                            className={darkMode
                              ? 'rounded-lg border border-blue-600/40 bg-blue-600/20 px-3 py-2 text-xs font-semibold text-blue-200'
                              : 'rounded-lg border border-blue-300 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-800'}
                          >
                            {confirmingPaymentId === payment.id ? 'Saqlanmoqda...' : 'Pul berdim'}
                          </button>
                        </div>
                      )}
                      {payment.method === 'OFFLINE' && payment.source === 'CASH' && payment.tenantConfirmedAt && (
                        <div className={darkMode ? 'text-xs text-blue-300' : 'text-xs text-blue-700'}>
                          {payment.tenantConfirmedAmount != null ? `Bergan summa: ${Number(payment.tenantConfirmedAmount).toLocaleString()} UZS` : 'Tenant tasdiqlagan'}
                        </div>
                      )}
                    </div>
                  )}

                  {payment.status === 'CONFIRMED' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleDownloadReceipt(payment.id)}
                        disabled={loadingReceipt === payment.id}
                        className={darkMode ? 'rounded-xl bg-green-500/15 px-4 py-2 text-sm text-green-300' : 'rounded-xl bg-green-100 px-4 py-2 text-sm text-green-700'}
                      >
                        {loadingReceipt === payment.id ? 'Yuklanmoqda...' : (t.receipt || 'Chek')}
                      </button>
                    </div>
                  )}

                  {(payment.invoiceDueDate || payment.invoiceStatus) && (
                    <p className={darkMode ? 'mt-3 text-xs text-slate-500' : 'mt-3 text-xs text-slate-600'}>
                      Invoice holati: {payment.invoiceStatus || '-'}{payment.invoiceDueDate ? ` • Muddat: ${new Date(payment.invoiceDueDate).toLocaleDateString('uz-UZ')}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {receiptData && (
        <ReceiptDownload receiptData={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </>
  );
}
