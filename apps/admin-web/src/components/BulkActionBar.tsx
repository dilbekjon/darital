'use client';

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface BulkAction {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  actions,
}) => {
  const { darkMode } = useTheme();
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  const getButtonStyle = (variant: BulkAction['variant']) => {
    switch (variant) {
      case 'danger':
        return darkMode
          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-600/30'
          : 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200';
      case 'success':
        return darkMode
          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border-green-600/30'
          : 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
      default:
        return darkMode
          ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-600/30'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200';
    }
  };

  return (
    <div
      className={`sticky bottom-4 mx-4 rounded-2xl shadow-2xl border p-4 backdrop-blur-lg z-40 ${
        darkMode
          ? 'bg-gray-900/95 border-blue-500/30'
          : 'bg-white/95 border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}
          >
            <span className="font-bold">{selectedCount}</span>
            <span>{t.selected || 'selected'}</span>
          </div>
          <button
            onClick={onClearSelection}
            className={`text-sm font-medium ${
              darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.clearSelection || 'Clear selection'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border disabled:opacity-50 ${getButtonStyle(
                action.variant
              )}`}
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulkActionBar;
