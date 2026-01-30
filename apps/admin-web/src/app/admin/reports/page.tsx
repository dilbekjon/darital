'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { fetchApi, ApiError } from '../../../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const SUMMARY_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444'];
const CONTRACT_COLORS = ['#22c55e', '#3b82f6', '#94a3b8', '#ef4444'];
const PAYMENT_COLORS = ['#22c55e', '#eab308', '#ef4444'];
const INVOICE_COLORS = ['#22c55e', '#eab308', '#ef4444'];

function formatUzs(n: number) {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminReportsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('reports.view')) {
        setPageLoading(false);
        return;
      }
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setPageLoading(false);
    }
  }, [loading, user, hasPermission]);

  const fetchReports = async () => {
    if (!user || !hasPermission('reports.view')) return;
    setPageLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any>(`/reports?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setPageLoading(false);
    }
  };

  const exportToPdf = useCallback(async () => {
    if (!reportRef.current || !reportData) return;
    setExportingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: darkMode ? '#111827' : '#f9fafb',
      });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pdfW;
      let h = pdfW / ratio;
      if (h > pdfH) {
        h = pdfH;
        w = pdfH * ratio;
      }
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      const fileName = `hisobot-${startDate}-${endDate}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
    }
  }, [reportData, startDate, endDate, darkMode]);

  if (loading || pageLoading) {
    return (
      <div
        className={`flex flex-1 items-center justify-center min-h-screen ${
          darkMode ? 'bg-black' : 'bg-gray-100'
        }`}
      >
        <div
          className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
            darkMode ? 'border-blue-500' : 'border-blue-500'
          }`}
        />
      </div>
    );
  }

  if (!user || !hasPermission('reports.view')) {
    return <NoAccess />;
  }

  const summaryBarData = reportData
    ? [
        { name: t.totalRevenue || 'Daromad', value: reportData.summary?.totalRevenue ?? 0, fill: SUMMARY_COLORS[0] },
        { name: t.totalInvoiced || 'Hisob-faktura', value: reportData.summary?.totalInvoiced ?? 0, fill: SUMMARY_COLORS[1] },
        { name: t.pendingPayments || 'Kutilmoqda', value: reportData.summary?.pendingPayments ?? 0, fill: SUMMARY_COLORS[2] },
        { name: t.outstandingAmount || 'Qarzdorlik', value: Math.max(0, reportData.summary?.outstandingAmount ?? 0), fill: SUMMARY_COLORS[3] },
      ]
    : [];

  const contractsPieData = reportData?.contracts
    ? [
        { name: t.active || 'Faol', value: reportData.contracts.active ?? 0, color: CONTRACT_COLORS[0] },
        { name: t.completed || 'Yakunlangan', value: reportData.contracts.completed ?? 0, color: CONTRACT_COLORS[1] },
        { name: t.draft || 'Qoralama', value: reportData.contracts.draft ?? 0, color: CONTRACT_COLORS[2] },
        { name: t.cancelled || 'Bekor', value: reportData.contracts.cancelled ?? 0, color: CONTRACT_COLORS[3] },
      ].filter((d) => d.value > 0)
    : [];

  const paymentsPieData = reportData?.payments
    ? [
        { name: t.confirmed || 'Tasdiqlangan', value: reportData.payments.confirmed ?? 0, color: PAYMENT_COLORS[0] },
        { name: t.pending || 'Kutilmoqda', value: reportData.payments.pending ?? 0, color: PAYMENT_COLORS[1] },
        { name: t.cancelled || 'Bekor', value: reportData.payments.cancelled ?? 0, color: PAYMENT_COLORS[2] },
      ].filter((d) => d.value > 0)
    : [];

  const invoicesPieData = reportData?.invoices
    ? [
        { name: t.paid || "To'langan", value: reportData.invoices.paid ?? 0, color: INVOICE_COLORS[0] },
        { name: t.pending || 'Kutilmoqda', value: reportData.invoices.pending ?? 0, color: INVOICE_COLORS[1] },
        { name: t.overdue || 'Muddati o\'tgan', value: reportData.invoices.overdue ?? 0, color: INVOICE_COLORS[2] },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div
      className={`p-4 sm:p-6 lg:p-8 min-h-screen transition-colors ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}
    >
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.reports || 'Reports' },
        ]}
      />

      <div className="mb-6">
        <h1
          className={`text-2xl sm:text-3xl font-bold transition-colors ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {t.reports || 'Reports'}
        </h1>
        <p className={`text-sm mt-1 transition-colors ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.generateAndViewReports || 'Generate and view financial reports'}
        </p>
      </div>

      {error && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg border ${
            darkMode
              ? 'bg-red-900/20 border-red-800 text-red-300'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}
          role="alert"
        >
          {error}
        </div>
      )}

      <div
        className={`shadow-lg rounded-xl p-6 mb-6 border transition-all duration-300 ${
          darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
        }`}
      >
        <h2
          className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}
        >
          {t.dateRange}
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label
              htmlFor="startDate"
              className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              {t.startDate}
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`mt-1 block w-full rounded-lg shadow-sm px-3 py-2 border transition-colors ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              {t.endDate}
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`mt-1 block w-full rounded-lg shadow-sm px-3 py-2 border transition-colors ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <button
            onClick={fetchReports}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 active:scale-[0.98] ${
              darkMode
                ? 'bg-blue-500 text-white hover:bg-blue-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
            disabled={!startDate || !endDate}
          >
            {t.generateReport}
          </button>
        </div>
      </div>

      {reportData ? (
        <>
          <div
            ref={reportRef}
            className={`rounded-xl border overflow-hidden transition-colors ${
              darkMode ? 'bg-gray-900/80 border-blue-600/20' : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-6 sm:p-8">
              <h2
                className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}
              >
                {t.reportSummary}
              </h2>
              <p
                className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {startDate} — {endDate}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: t.totalRevenue,
                    value: reportData.summary?.totalRevenue ?? 0,
                    color: darkMode ? 'text-green-400' : 'text-green-600',
                    bg: darkMode ? 'bg-green-500/10' : 'bg-green-50',
                    border: darkMode ? 'border-green-500/30' : 'border-green-200',
                    delay: 0,
                  },
                  {
                    label: t.totalInvoiced,
                    value: reportData.summary?.totalInvoiced ?? 0,
                    color: darkMode ? 'text-blue-400' : 'text-blue-600',
                    bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                    border: darkMode ? 'border-blue-500/30' : 'border-blue-200',
                    delay: 50,
                  },
                  {
                    label: t.pendingPayments,
                    value: reportData.summary?.pendingPayments ?? 0,
                    color: darkMode ? 'text-yellow-400' : 'text-yellow-600',
                    bg: darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
                    border: darkMode ? 'border-yellow-500/30' : 'border-yellow-200',
                    delay: 100,
                  },
                  {
                    label: t.outstandingAmount,
                    value: reportData.summary?.outstandingAmount ?? 0,
                    color: darkMode ? 'text-red-400' : 'text-red-600',
                    bg: darkMode ? 'bg-red-500/10' : 'bg-red-50',
                    border: darkMode ? 'border-red-500/30' : 'border-red-200',
                    delay: 150,
                  },
                ].map((card, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-5 border ${card.bg} ${card.border} animate-report-fade-in-up opacity-0`}
                    style={{
                      animationDelay: `${card.delay}ms`,
                      animationFillMode: 'forwards',
                    }}
                  >
                    <p
                      className={`text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {card.label}
                    </p>
                    <p className={`text-2xl font-bold ${card.color} tabular-nums`}>
                      {formatUzs(card.value)} UZS
                    </p>
                  </div>
                ))}
              </div>

              {summaryBarData.some((d) => d.value > 0) && (
                <div className="mb-10">
                  <h3
                    className={`text-lg font-semibold mb-4 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Moliyaviy ko‘rsatkichlar
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summaryBarData}
                        margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
                        layout="vertical"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
                        />
                        <XAxis
                          type="number"
                          tickFormatter={formatUzs}
                          stroke={darkMode ? '#9ca3af' : '#6b7280'}
                          fontSize={12}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          stroke={darkMode ? '#9ca3af' : '#6b7280'}
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#1f2937' : '#fff',
                            border: darkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}
                          formatter={(value: number) => [formatUzs(value) + ' UZS', '']}
                        />
                        <Bar
                          dataKey="value"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={48}
                          isAnimationActive
                          animationDuration={800}
                          animationEasing="ease-out"
                        >
                          {summaryBarData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {contractsPieData.length > 0 && (
                  <div
                    className={`rounded-xl p-5 border ${
                      darkMode ? 'border-blue-600/20' : 'border-gray-200'
                    }`}
                  >
                    <h3
                      className={`text-lg font-semibold mb-4 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {t.contracts}
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={contractsPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}`}
                            isAnimationActive
                            animationDuration={600}
                            animationEasing="ease-out"
                          >
                            {contractsPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? '#1f2937' : '#fff',
                              border: darkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid #e5e7eb',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {paymentsPieData.length > 0 && (
                  <div
                    className={`rounded-xl p-5 border ${
                      darkMode ? 'border-blue-600/20' : 'border-gray-200'
                    }`}
                  >
                    <h3
                      className={`text-lg font-semibold mb-4 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {t.payments}
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentsPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}`}
                            isAnimationActive
                            animationDuration={600}
                            animationEasing="ease-out"
                          >
                            {paymentsPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? '#1f2937' : '#fff',
                              border: darkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid #e5e7eb',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {invoicesPieData.length > 0 && (
                  <div
                    className={`rounded-xl p-5 border ${
                      darkMode ? 'border-blue-600/20' : 'border-gray-200'
                    }`}
                  >
                    <h3
                      className={`text-lg font-semibold mb-4 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {t.invoices}
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={invoicesPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}`}
                            isAnimationActive
                            animationDuration={600}
                            animationEasing="ease-out"
                          >
                            {invoicesPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? '#1f2937' : '#fff',
                              border: darkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid #e5e7eb',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl p-5 border ${
                  darkMode ? 'border-blue-600/20 bg-black/30' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t.contracts} — {t.total}
                  </p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportData.contracts?.total ?? 0}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t.payments} — {t.total}
                  </p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportData.payments?.total ?? 0}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t.invoices} — {t.total}
                  </p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reportData.invoices?.total ?? 0}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Darital
                  </p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {t.reportSummary}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={exportToPdf}
              disabled={exportingPdf}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-blue-500 text-white hover:bg-blue-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {exportingPdf ? (
                <>
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  {t.exporting || 'Eksport...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t.exportToPdf || 'Export to PDF'}
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div
          className={`shadow-lg rounded-xl p-12 text-center border transition-colors ${
            darkMode
              ? 'bg-black border-blue-600/30 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          <p className="text-lg">{t.selectDatesAndGenerate}</p>
        </div>
      )}

    </div>
  );
}
