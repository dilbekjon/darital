'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTenantBalanceHistory, BalanceHistory, LedgerEntry } from '../../../lib/tenantApi';
import { ApiError } from '../../../lib/api';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import DaritalLoader from '../../../components/DaritalLoader';

const TYPE_LABEL: Record<LedgerEntry['type'], string> = {
  DEPOSIT: "Depozit (boshlang'ich to'lov)",
  RENT_CHARGE: "Ijara to'lovi",
  UTILITY_CHARGE: "Kommunal to'lov",
  PAYMENT: "To'lov qabul qilindi",
  ADJUSTMENT: 'Tuzatish',
  REVERSAL: 'Bekor qilindi',
};

const TYPE_ICON: Record<LedgerEntry['type'], string> = {
  DEPOSIT: '💰',
  RENT_CHARGE: '🏠',
  UTILITY_CHARGE: '💡',
  PAYMENT: '✅',
  ADJUSTMENT: '✏️',
  REVERSAL: '↩️',
};

function money(n: number): string {
  return `${Math.round(n).toLocaleString('uz-UZ')} so'm`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function TenantBalancePage() {
  const [data, setData] = useState<BalanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { darkMode } = useTheme();

  useEffect(() => {
    const load = async () => {
      try {
        setData(await getTenantBalanceHistory());
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) return <DaritalLoader />;

  const current = data?.current ?? 0;
  const isDebt = current < 0;
  const entries = data?.entries ?? [];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <TenantNavbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4">Balans</h1>

        {/* Current balance card */}
        <div
          className={`rounded-2xl p-6 mb-6 border ${
            isDebt
              ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800'
              : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
          }`}
        >
          <p className={`text-sm font-medium ${isDebt ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {isDebt ? 'Qarzingiz' : 'Mavjud balans'}
          </p>
          <p className={`text-3xl font-extrabold mt-1 ${isDebt ? 'text-red-700 dark:text-red-200' : 'text-emerald-700 dark:text-emerald-200'}`}>
            {money(Math.abs(current))}
          </p>
          <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
            {isDebt
              ? "Balansingiz tugagan. Iltimos, to'lovni amalga oshiring."
              : "Har oy ijara shu balansdan avtomatik yechiladi."}
          </p>
        </div>

        {/* History timeline */}
        <h2 className="text-base font-semibold mb-3">Balans tarixi</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Hozircha o'zgarishlar yo'q.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const credit = e.amount >= 0;
              return (
                <li
                  key={e.id}
                  className={`flex items-start gap-3 rounded-xl p-3 border ${
                    darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5">{TYPE_ICON[e.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{TYPE_LABEL[e.type]}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(e.occurredAt)}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className={`text-sm font-semibold ${credit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {credit ? '+' : '−'}{money(Math.abs(e.amount))}
                    </p>
                    <p className="text-[11px] text-gray-400">Balans: {money(e.balanceAfter)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
