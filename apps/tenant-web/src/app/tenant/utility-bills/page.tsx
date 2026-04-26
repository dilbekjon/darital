'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import { getTenantUtilityBills, payTenantUtilityBill, TenantUtilityBill } from '../../../lib/tenantApi';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';
import { useTheme } from '../../../contexts/ThemeContext';

const TYPE_LABEL: Record<'WATER' | 'ELECTRICITY' | 'GAS', string> = {
  WATER: 'Suv',
  ELECTRICITY: 'Elektr',
  GAS: 'Gaz',
};

export default function TenantUtilityBillsPage() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<TenantUtilityBill[]>([]);

  const loadBills = async () => {
    setBills(await getTenantUtilityBills());
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

  const handlePay = async (bill: TenantUtilityBill, source: 'BANK' | 'CASH') => {
    const amount = window.prompt('To‘lov summasi (bo‘sh qoldirsangiz to‘liq qoldiq):', '');
    setPayingBillId(bill.id);
    setError(null);
    try {
      await payTenantUtilityBill(bill.id, {
        source,
        amount: amount?.trim() ? amount.trim() : undefined,
      });
      await loadBills();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('To‘lov yaratishda xatolik');
      }
    } finally {
      setPayingBillId(null);
    }
  };

  if (loading) return <DaritalLoader darkMode={darkMode} />;

  return (
    <>
      <TenantNavbar />
      <div className={darkMode ? 'min-h-screen bg-black text-white' : 'min-h-screen bg-slate-50 text-slate-900'}>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-3xl font-semibold">Kommunal to‘lovlar</h1>
          <p className={darkMode ? 'mt-2 text-sm text-slate-400' : 'mt-2 text-sm text-slate-600'}>
            Suv, elektr va gaz hisoblari bo‘yicha oylik billing va to‘lov holati.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={darkMode ? 'rounded-xl border border-slate-800 bg-slate-950 p-4' : 'rounded-xl border border-slate-200 bg-white p-4'}>
              <p className="text-xs opacity-70">Umumiy hisob</p>
              <p className="mt-1 text-xl font-semibold">UZS {Math.round(totals.total).toLocaleString()}</p>
            </div>
            <div className={darkMode ? 'rounded-xl border border-green-700/40 bg-green-900/20 p-4' : 'rounded-xl border border-green-200 bg-green-50 p-4'}>
              <p className="text-xs opacity-70">To‘langan</p>
              <p className="mt-1 text-xl font-semibold">UZS {Math.round(totals.paid).toLocaleString()}</p>
            </div>
            <div className={darkMode ? 'rounded-xl border border-amber-700/40 bg-amber-900/20 p-4' : 'rounded-xl border border-amber-200 bg-amber-50 p-4'}>
              <p className="text-xs opacity-70">Qolgan</p>
              <p className="mt-1 text-xl font-semibold">UZS {Math.round(totals.remaining).toLocaleString()}</p>
            </div>
          </div>

          {bills.length === 0 ? (
            <div className={darkMode ? 'mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center text-slate-400' : 'mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500'}>
              Hozircha kommunal hisob mavjud emas.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {bills.map((bill) => (
                <div key={bill.id} className={darkMode ? 'rounded-2xl border border-slate-800 bg-slate-950 p-5' : 'rounded-2xl border border-slate-200 bg-white p-5'}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{TYPE_LABEL[bill.type]} • {bill.month}</p>
                      <p className={darkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-600'}>
                        {bill.unitName || 'Unit'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">UZS {Math.round(bill.amount).toLocaleString()}</p>
                      <p className={darkMode ? 'text-xs text-slate-400' : 'text-xs text-slate-600'}>
                        Qoldiq: UZS {Math.round(bill.remainingAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className={darkMode ? 'mt-2 text-xs text-slate-400' : 'mt-2 text-xs text-slate-600'}>
                    Ko‘rsatkich: {bill.startReading ?? '-'} → {bill.endReading ?? '-'} • Sarf: {bill.consumption.toLocaleString()} • Tarif: {bill.unitPrice.toLocaleString()}
                  </p>

                  {bill.remainingAmount > 0 && bill.status !== 'CANCELLED' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handlePay(bill, 'BANK')}
                        disabled={payingBillId === bill.id}
                        className={darkMode ? 'rounded-lg border border-blue-600/40 bg-blue-600/20 px-3 py-2 text-xs font-semibold text-blue-200' : 'rounded-lg border border-blue-300 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-800'}
                      >
                        {payingBillId === bill.id ? 'Saqlanmoqda...' : 'Bank orqali to‘lash'}
                      </button>
                      <button
                        onClick={() => handlePay(bill, 'CASH')}
                        disabled={payingBillId === bill.id}
                        className={darkMode ? 'rounded-lg border border-amber-600/40 bg-amber-600/20 px-3 py-2 text-xs font-semibold text-amber-200' : 'rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800'}
                      >
                        {payingBillId === bill.id ? 'Saqlanmoqda...' : 'Naqd to‘lov'}
                      </button>
                    </div>
                  )}

                  {bill.payments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {bill.payments.map((payment) => (
                        <div key={payment.id} className={darkMode ? 'rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300' : 'rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700'}>
                          {payment.source} • UZS {Math.round(payment.amount).toLocaleString()} • {payment.status}
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
