'use client';

import { useUntypedTranslations } from '../i18n/useUntypedTranslations';
import { useTheme } from '../contexts/ThemeContext';

interface SystemStatusProps {
  className?: string;
}

export default function SystemStatus({ className = '' }: SystemStatusProps) {
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 transition-all duration-300 ${
      darkMode
        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
    } ${className}`}>

      {/* Animated pulse dot */}
      <div className="relative">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
      </div>

      {/* Status text */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {darkMode && '✨ '}
          {t.systemOnline}
        </span>
        <span className={`text-xs ${
          darkMode ? 'text-green-300' : 'text-green-600'
        }`}>
          •
        </span>
        <span className={`text-xs ${
          darkMode ? 'text-green-300' : 'text-green-600'
        }`}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}