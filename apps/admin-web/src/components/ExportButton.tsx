'use client';

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchApi } from '../lib/api';

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  filters?: Record<string, string>;
  label?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  endpoint,
  filename,
  filters,
  label,
}) => {
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const queryParams = new URLSearchParams(filters || {}).toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${endpoint}${queryParams ? '?' + queryParams : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
      alert(t.exportError || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        darkMode
          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30'
          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
      } disabled:opacity-50`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          {t.exporting || 'Exporting...'}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {label || t.exportCSV || 'Export CSV'}
        </>
      )}
    </button>
  );
};

export default ExportButton;
