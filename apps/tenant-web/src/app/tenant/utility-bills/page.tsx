'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import { getTenantUtilityBills, payTenantUtilityBill, TenantUtilityBill } from '../../../lib/tenantApi';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';
import { useTheme } from '../../../contexts/ThemeContext';

type UtilityType = 'WATER' | 'ELECTRICITY' | 'GAS';
type PaySource = 'BANK' | 'CASH';

const TYPE_LABEL: Record<UtilityType, string> = {
  WATER: 'Suv',
  ELECTRICITY: 'Svet',
  GAS: 'Gaz',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  TENANT_SUBMITTED: 'Yuborildi',
  COLLECTOR_CONFIRMED: 'Yig‘uvchi qabul qildi',
  HANDED_TO_CASHIER: 'Kassirga topshirildi',
  CASHIER_CONFIRMED: 'Kassir tasdiqladi',
  REJECTED: 'Rad etildi',
};

export default function TenantUtilityBillsPage() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<TenantUtilityBill[]>([]);
  const [activeType, setActiveType] = useState<UtilityType>('WATER');
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});

  const loadBills = async () => {
    const list = await getTenantUtilityBills();
    setBills(list);
    setAmountInputs(() =>
      Object.fromEntries(
        list.map((bill) => [bill.id, String(Math.max(0, Number(bill.remainingAmount || 0)))]),
      ),
    );
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadBills();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
        } else {
          setError('Kommunal to‘lovlarni yuklab bo‘lmadi');
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [router]);

  useEffect(() => {
    if (bills.length === 0) return;
    const availableTypes = Array.from(new Set(bills.map((bill) => bill.type)));
    if (!availableTypes.includes(activeType)) {
      setActiveType(availableTypes[0] as UtilityType);
    }
  }, [bills, activeType]);

  const totals = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        acc.total += bill.amount;
        acc.paid += bill.paidAmount;
        acc.remaining += bill.remainingAmount;
        return acc;
      },
      { total: 0, paid: 0, remaining: 0 },
    );
  }, [bills]);

  const filteredBills = useMemo(() => bills.filter((bill) => bill.type === activeType), [bills, activeType]);

  const createPayment = async (bill: TenantUtilityBill, source: PaySource) => {
    const raw = amountInputs[bill.id] ?? '';
    const normalized = raw.trim();
    const parsed = normalized ? Number(normalized) : NaN;
    const amountToSend = Number.isFinite(parsed) && parsed > 0 ? String(parsed) : String(Math.max(0, bill.remainingAmount));
    if (!Number.isFinite(Number(amountToSend)) || Number(amountToSend) <= 0) {
      setError('To‘g‘ri summa kiriting');
      return;
    }

    setPayingKey(`${bill.id}:${source}`);
    setError(null);
    try {
      await payTenantUtilityBill(bill.id, { source, amount: amountToSend });
      await loadBills();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('To‘lov yaratishda xatolik');
    } finally {
      setPayingKey(null);
    }
  };

  if (loading) return <DaritalLoader darkMode={darkMode} />;

  return (
    <>
      <TenantNavbar />
      <div className={darkMode ? 'min-h-screen bg-black text-white' : 'min-h-screen bg-slate-50 text-slate-900'}>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-3xl font-semibold">Kommunal bo‘lim</h1>
          <p className={darkMode ? 'mt-2 text-sm text-slate-400' : 'mt-2 text-sm text-slate-600'}>
            Har bir tur uchun: oy, hisoblagich holati, to‘lov summasi va to‘lov jarayoni.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={darkMode ? 'rounded-xl border border-slate-800 bg-slate-950 p-4' : 'rounded-xl border border-slate-200 bg-white p-4'}>
              <p className="text-xs opacity-70">Umumiy hisob</p>
              <p className="mt-1 text-xl font-semibold">{Math.round(totals.total).toLocaleString()} UZS</p>
            </div>
            <div className={darkMode ? 'rounded-xl border border-green-700/40 bg-green-900/20 p-4' : 'rounded-xl border border-green-200 bg-green-50 p-4'}>
              <p className="text-xs opacity-70">To‘langan</p>
              <p className="mt-1 text-xl font-semibold">{Math.round(totals.paid).toLocaleString()} UZS</p>
            </div>
            <div className={darkMode ? 'rounded-xl border border-amber-700/40 bg-amber-900/20 p-4' : 'rounded-xl border border-amber-200 bg-amber-50 p-4'}>
              <p className="text-xs opacity-70">Qolgan</p>
              <p className="mt-1 text-xl font-semibold">{Math.round(totals.remaining).toLocaleString()} UZS</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(new Set(bills.map((bill) => bill.type))).map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type as UtilityType)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  activeType === type
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-slate-900 text-slate-300 border border-slate-700'
                      : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {TYPE_LABEL[type]}
              </button>
            ))}
          </div>

          {filteredBills.length === 0 ? (
            <div className={darkMode ? 'mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center text-slate-400' : 'mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500'}>
              Hozircha {TYPE_LABEL[activeType].toLowerCase()} bo‘yicha hisob mavjud emas.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {filteredBills.map((bill) => (
                <div key={bill.id} className={darkMode ? 'rounded-2xl border border-slate-800 bg-slate-950 p-5' : 'rounded-2xl border border-slate-200 bg-white p-5'}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{TYPE_LABEL[bill.type]} • {bill.month}</p>
                      <p className={darkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-600'}>
                        {bill.unitName || 'Unit'} • Holat: {bill.startReading ?? '-'} → {bill.endReading ?? '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">{Math.round(bill.amount).toLocaleString()} UZS</p>
                      <p className={darkMode ? 'text-xs text-slate-400' : 'text-xs text-slate-600'}>
                        Qoldiq: {Math.round(bill.remainingAmount).toLocaleString()} UZS
                      </p>
                    </div>
                  </div>

                  {bill.remainingAmount > 0 && bill.status !== 'CANCELLED' && (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-400/40 p-3">
                      <label className={darkMode ? 'text-xs text-slate-400' : 'text-xs text-slate-600'}>
                        To‘lash summasi
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={amountInputs[bill.id] ?? ''}
                        onChange={(e) => setAmountInputs((prev) => ({ ...prev, [bill.id]: e.target.value }))}
                        className={darkMode ? 'mt-1 w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm text-white' : 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900'}
                        placeholder={`${Math.round(bill.remainingAmount)}`}
                      />
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => createPayment(bill, 'CASH')}
                          disabled={payingKey === `${bill.id}:CASH`}
                          className={darkMode ? 'rounded-lg border border-amber-600/40 bg-amber-600/20 px-3 py-2 text-xs font-semibold text-amber-200' : 'rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800'}
                        >
                          {payingKey === `${bill.id}:CASH` ? 'Yuborilmoqda...' : 'Naqd beraman'}
                        </button>
                        <button
                          onClick={() => createPayment(bill, 'BANK')}
                          disabled={payingKey === `${bill.id}:BANK`}
                          className={darkMode ? 'rounded-lg border border-blue-600/40 bg-blue-600/20 px-3 py-2 text-xs font-semibold text-blue-200' : 'rounded-lg border border-blue-300 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-800'}
                        >
                          {payingKey === `${bill.id}:BANK` ? 'Yuborilmoqda...' : 'Bank orqali'}
                        </button>
                      </div>
                    </div>
                  )}

                  {bill.payments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {bill.payments.map((payment) => (
                        <div key={payment.id} className={darkMode ? 'rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300' : 'rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700'}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{payment.source} • {Math.round(payment.amount).toLocaleString()} UZS</span>
                            <span className="font-semibold">{PAYMENT_STATUS_LABEL[payment.workflowStatus || payment.status] || payment.status}</span>
                          </div>
                          {payment.handoverOverdue && (
                            <p className="mt-1 text-red-500">Pul kassirga o‘z vaqtida topshirilmagan</p>
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
      </div>
    </>
  );
}
