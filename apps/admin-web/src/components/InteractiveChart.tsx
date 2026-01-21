'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  details?: { label: string; value: number }[];
}

interface InteractiveChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'pie' | 'donut';
  height?: number;
  showLegend?: boolean;
  onDrillDown?: (point: ChartDataPoint) => void;
  formatValue?: (value: number) => string;
}

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  title,
  data,
  type,
  height = 300,
  showLegend = true,
  onDrillDown,
  formatValue = (v) => v.toLocaleString(),
}) => {
  const { darkMode } = useTheme();
  const t = useUntypedTranslations();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const getColor = (index: number) => data[index]?.color || defaultColors[index % defaultColors.length];

  const handleExport = () => {
    if (!chartRef.current) return;

    // Create a canvas to capture the chart
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 500;

    // Draw background
    ctx.fillStyle = darkMode ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = darkMode ? '#ffffff' : '#1a1a1a';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(title, 20, 40);

    // Draw chart based on type
    const chartY = 70;
    const chartHeight = 300;
    const chartWidth = 700;
    const barWidth = chartWidth / data.length - 20;

    if (type === 'bar') {
      data.forEach((d, i) => {
        const barHeight = (d.value / maxValue) * chartHeight;
        const x = 50 + i * (barWidth + 20);
        const y = chartY + chartHeight - barHeight;

        ctx.fillStyle = getColor(i);
        ctx.fillRect(x, y, barWidth, barHeight);

        // Label
        ctx.fillStyle = darkMode ? '#888888' : '#666666';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, x + barWidth / 2, chartY + chartHeight + 20);

        // Value
        ctx.fillStyle = darkMode ? '#ffffff' : '#1a1a1a';
        ctx.fillText(formatValue(d.value), x + barWidth / 2, y - 10);
      });
    } else if (type === 'pie' || type === 'donut') {
      const centerX = canvas.width / 2;
      const centerY = chartY + chartHeight / 2;
      const radius = 120;
      let startAngle = -Math.PI / 2;

      data.forEach((d, i) => {
        const sliceAngle = (d.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = getColor(i);
        ctx.fill();

        startAngle = endAngle;
      });

      if (type === 'donut') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = darkMode ? '#1a1a1a' : '#ffffff';
        ctx.fill();
      }
    }

    // Draw legend
    let legendY = chartY + chartHeight + 50;
    ctx.font = '14px Inter, sans-serif';
    data.forEach((d, i) => {
      const legendX = 50 + (i % 3) * 250;
      if (i > 0 && i % 3 === 0) legendY += 25;

      ctx.fillStyle = getColor(i);
      ctx.fillRect(legendX, legendY - 10, 14, 14);

      ctx.fillStyle = darkMode ? '#cccccc' : '#444444';
      ctx.fillText(`${d.label}: ${formatValue(d.value)}`, legendX + 20, legendY);
    });

    // Download
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleClick = (index: number) => {
    if (data[index]?.details && onDrillDown) {
      setSelectedIndex(index);
      setShowDrillDown(true);
      onDrillDown(data[index]);
    }
  };

  // Render bar chart
  const renderBarChart = () => (
    <div className="flex items-end justify-around h-full px-4 pb-8">
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * 100;
        const isHovered = hoveredIndex === i;
        const hasDetails = d.details && d.details.length > 0;

        return (
          <div
            key={i}
            className="flex flex-col items-center gap-2 flex-1 max-w-[80px]"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleClick(i)}
          >
            {/* Value tooltip */}
            {isHovered && (
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-lg'
                }`}
              >
                {formatValue(d.value)}
              </div>
            )}
            {/* Bar */}
            <div
              className={`w-full rounded-t-lg transition-all duration-300 ${
                hasDetails ? 'cursor-pointer' : ''
              }`}
              style={{
                height: `${barHeight}%`,
                backgroundColor: getColor(i),
                opacity: isHovered ? 1 : 0.85,
                transform: isHovered ? 'scaleX(1.1)' : 'scaleX(1)',
              }}
            />
            {/* Label */}
            <span
              className={`text-xs text-center truncate w-full ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  // Render line chart
  const renderLineChart = () => {
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1 || 1)) * 100,
      y: 100 - (d.value / maxValue) * 100,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
      <div className="relative w-full h-full">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Area fill */}
          <path
            d={areaD}
            fill={`${getColor(0)}20`}
            className="transition-all duration-300"
          />
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={getColor(0)}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="transition-all duration-300"
          />
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={getColor(0)}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleClick(i)}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          ))}
        </svg>
        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className={`absolute px-2 py-1 rounded text-xs font-medium pointer-events-none ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-lg'
            }`}
            style={{
              left: `${points[hoveredIndex].x}%`,
              top: `${points[hoveredIndex].y}%`,
              transform: 'translate(-50%, -150%)',
            }}
          >
            {data[hoveredIndex].label}: {formatValue(data[hoveredIndex].value)}
          </div>
        )}
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {data.map((d, i) => (
            <span
              key={i}
              className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Render pie/donut chart
  const renderPieChart = () => {
    let currentAngle = -90;

    return (
      <div className="relative flex items-center justify-center h-full">
        <svg
          className="w-48 h-48 transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {data.map((d, i) => {
            const percentage = (d.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const isHovered = hoveredIndex === i;
            const hasDetails = d.details && d.details.length > 0;

            // Calculate arc path
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = ((startAngle + angle) * Math.PI) / 180;
            const largeArc = angle > 180 ? 1 : 0;

            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);

            const innerRadius = type === 'donut' ? 25 : 0;
            const ix1 = 50 + innerRadius * Math.cos(startRad);
            const iy1 = 50 + innerRadius * Math.sin(startRad);
            const ix2 = 50 + innerRadius * Math.cos(endRad);
            const iy2 = 50 + innerRadius * Math.sin(endRad);

            const pathD =
              type === 'donut'
                ? `M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
                : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return (
              <path
                key={i}
                d={pathD}
                fill={getColor(i)}
                className={`transition-all duration-200 ${hasDetails ? 'cursor-pointer' : ''}`}
                style={{
                  opacity: isHovered ? 1 : 0.85,
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleClick(i)}
              />
            );
          })}
        </svg>

        {/* Center text for donut */}
        {type === 'donut' && (
          <div className="absolute flex flex-col items-center">
            <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {formatValue(total)}
            </span>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t.total || 'Total'}
            </span>
          </div>
        )}

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className={`absolute top-4 right-4 px-3 py-2 rounded-lg ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-lg'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getColor(hoveredIndex) }}
              />
              <span className="font-medium">{data[hoveredIndex].label}</span>
            </div>
            <div className="text-lg font-bold">{formatValue(data[hoveredIndex].value)}</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {((data[hoveredIndex].value / total) * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={chartRef}
      className={`rounded-2xl border p-4 ${
        darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
        <button
          onClick={handleExport}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
          title={t.exportChart || 'Export chart'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        {type === 'bar' && renderBarChart()}
        {type === 'line' && renderLineChart()}
        {(type === 'pie' || type === 'donut') && renderPieChart()}
      </div>

      {/* Legend */}
      {showLegend && (type === 'pie' || type === 'donut') && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {data.map((d, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                hoveredIndex !== null && hoveredIndex !== i ? 'opacity-50' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getColor(i) }}
              />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Drill-down modal */}
      {showDrillDown && selectedIndex !== null && data[selectedIndex]?.details && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-lg rounded-2xl p-6 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {data[selectedIndex].label} - {t.details || 'Details'}
              </h3>
              <button
                onClick={() => setShowDrillDown(false)}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {data[selectedIndex].details!.map((detail, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}
                >
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{detail.label}</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {formatValue(detail.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveChart;
