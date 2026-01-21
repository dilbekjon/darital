'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';

interface ChartData {
  month: string;
  monthLabel: string;
  paid: number;
  due: number;
}

interface Summary {
  totalPaid: number;
  totalDue: number;
  onTimePayments: number;
  latePayments: number;
  averagePayment: number;
}

interface PaymentChartProps {
  chartData: ChartData[];
  summary: Summary;
}

const PaymentChart: React.FC<PaymentChartProps> = ({ chartData, summary }) => {
  const { darkMode } = useTheme();
  const t = useUntypedTranslations();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const maxValue = Math.max(...chartData.map(d => Math.max(d.paid, d.due)), 1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + ' UZS';
  };

  return (
    <div className={`rounded-2xl p-6 border ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 to-black border-blue-500/30' 
        : 'bg-white border-gray-200 shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          📊 {t.paymentHistory || 'Payment History'}
        </h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t.paid || 'Paid'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t.due || 'Due'}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{t.totalPaid || 'Total Paid'}</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{t.totalDue || 'Total Due'}</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            {formatCurrency(summary.totalDue)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{t.onTime || 'On Time'}</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {summary.onTimePayments} ✓
          </p>
        </div>
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{t.late || 'Late'}</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
            {summary.latePayments}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs">
          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>{formatCurrency(maxValue).split(' ')[0]}</span>
          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>{formatCurrency(maxValue / 2).split(' ')[0]}</span>
          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>0</span>
        </div>

        {/* Bars */}
        <div className="absolute left-20 right-0 top-0 bottom-0 flex items-end gap-1 pb-8">
          {chartData.map((data, index) => {
            const paidHeight = (data.paid / maxValue) * 100;
            const dueHeight = (data.due / maxValue) * 100;
            
            return (
              <div 
                key={data.month} 
                className="flex-1 flex flex-col items-center relative group"
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Tooltip */}
                {hoveredBar === index && (
                  <div className={`absolute bottom-full mb-2 p-3 rounded-lg shadow-xl z-10 min-w-[140px] ${
                    darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}>
                    <p className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {data.monthLabel}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {t.paid || 'Paid'}: {formatCurrency(data.paid)}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {t.due || 'Due'}: {formatCurrency(data.due)}
                    </p>
                  </div>
                )}

                {/* Bars container */}
                <div className="flex gap-1 w-full justify-center h-48">
                  {/* Paid bar */}
                  <div 
                    className="w-3 rounded-t-sm bg-gradient-to-t from-green-600 to-green-400 transition-all duration-300 hover:opacity-80"
                    style={{ height: `${paidHeight}%` }}
                  />
                  {/* Due bar */}
                  <div 
                    className="w-3 rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300 hover:opacity-80"
                    style={{ height: `${dueHeight}%` }}
                  />
                </div>

                {/* X-axis label */}
                <span className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {data.monthLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Average Payment */}
      <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.averagePayment || 'Average Payment'}: <span className="font-bold">{formatCurrency(summary.averagePayment)}</span>
        </p>
      </div>
    </div>
  );
};

export default PaymentChart;
