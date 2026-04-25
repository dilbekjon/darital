'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantInvoices } from '../../../lib/tenantApi';
import { ApiError } from '../../../lib/api';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';

export default function TenantInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  useEffect(() => {
    const load = async () => {
      try {
        setInvoices(await getTenantInvoices());
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

  const sortedInvoices = useMemo(() => {
    const statusPriority: Record<string, number> = { OVERDUE: 0, PENDING: 1, PAID: 2 };
    return [...invoices].sort((a, b) => {
      const statusA = a.derivedStatus || a.status;
      const statusB = b.derivedStatus || b.status;
      const priorityA = statusPriority[statusA] ?? 3;
      const priorityB = statusPriority[statusB] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [invoices]);

  const getDaysRemaining = (dueDate: string) =>
    Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (loading) return <DaritalLoader darkMode={darkMode} />;

  return (
    <>
      <TenantNavbar />
      <div className={darkMode ? 'min-h-screen bg-black text-white' : 'min-h-screen bg-slate-50 text-slate-900'}>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold">{t.invoicesList}</h1>
            <p className={darkMode ? 'mt-2 text-sm text-slate-400' : 'mt-2 text-sm text-slate-600'}>
              Bu bo‘lim qarzdorlikni ko‘rsatadi (qancha to‘langan, qancha qolgan). To‘lov operatsiyalari alohida `Payments` bo‘limida.
            </p>
          </div>

          {sortedInvoices.length === 0 ? (
            <div className={darkMode ? 'rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400' : 'rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500'}>
              {t.noInvoices}
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedInvoices.map((invoice) => {
                const days = getDaysRemaining(invoice.dueDate);
                const status = invoice.derivedStatus || invoice.status;
                return (
                  <div
                    key={invoice.id}
                    className={darkMode ? 'rounded-2xl border border-slate-800 bg-slate-950 p-5' : 'rounded-2xl border border-slate-200 bg-white p-5'}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold">{invoice.unitName}</p>
                        <p className={darkMode ? 'mt-1 text-sm text-slate-400' : 'mt-1 text-sm text-slate-500'}>
                          Muddat: {new Date(invoice.dueDate).toLocaleDateString('uz-UZ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold">{Number(invoice.amount).toLocaleString()} UZS</p>
                        <span className={status === 'PAID'
                          ? darkMode ? 'mt-2 inline-block rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-300' : 'mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs text-green-700'
                          : status === 'OVERDUE'
                            ? darkMode ? 'mt-2 inline-block rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300' : 'mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs text-red-700'
                            : darkMode ? 'mt-2 inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300' : 'mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700'}>
                          {status === 'PAID' ? t.paid : status === 'OVERDUE' ? t.overdue : t.pending}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className={darkMode ? 'rounded-xl bg-slate-900 p-4' : 'rounded-xl bg-slate-50 p-4'}>
                        <p className={darkMode ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>Umumiy summa</p>
                        <p className="mt-1 font-semibold">{Number(invoice.amount).toLocaleString()} UZS</p>
                      </div>
                      <div className={darkMode ? 'rounded-xl bg-slate-900 p-4' : 'rounded-xl bg-slate-50 p-4'}>
                        <p className={darkMode ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>Bank orqali</p>
                        <p className="mt-1 font-semibold">{Number(invoice.bankAmount || 0).toLocaleString()} UZS</p>
                      </div>
                      <div className={darkMode ? 'rounded-xl bg-slate-900 p-4' : 'rounded-xl bg-slate-50 p-4'}>
                        <p className={darkMode ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>Naqd orqali</p>
                        <p className="mt-1 font-semibold">{Number(invoice.cashAmount || 0).toLocaleString()} UZS</p>
                      </div>
                    </div>

                    <div className={darkMode ? 'mt-3 rounded-xl bg-slate-900 p-4 text-sm text-slate-200' : 'mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700'}>
                      <p>
                        To‘langan: <span className="font-semibold">{Number(invoice.totalPaid || 0).toLocaleString()} UZS</span>
                        {' '}• Qolgan: <span className="font-semibold">{Number(invoice.totalRemaining ?? invoice.amount).toLocaleString()} UZS</span>
                      </p>
                      <p className={darkMode ? 'mt-1 text-xs text-slate-400' : 'mt-1 text-xs text-slate-600'}>
                        To‘lovlar: {invoice.paymentSummary?.confirmed || 0} tasdiqlangan, {invoice.paymentSummary?.pending || 0} kutilmoqda
                      </p>
                    </div>

                    {status !== 'PAID' && (
                      <div className={darkMode ? 'mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200' : 'mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'}>
                        {days < 0
                          ? `${Math.abs(days)} kun kechikkan. To‘lov kassir yoki bank orqali rasmiylashtiriladi.`
                          : `${days} kun qoldi. To‘lovni kassirga topshirish yoki bank orqali yuborish kerak.`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
