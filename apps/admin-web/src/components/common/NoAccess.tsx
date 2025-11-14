import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export function NoAccess() {
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center text-center p-4 ${
      darkMode ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <div className={`rounded-2xl p-8 shadow-2xl border-2 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-yellow-500/40 text-white'
          : 'bg-white border-gray-200 text-gray-800'
      }`}>
        <svg 
          className={`mx-auto h-24 w-24 mb-6 ${darkMode ? 'text-yellow-500' : 'text-blue-500'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <h1 className={`text-4xl font-bold mb-4 ${
          darkMode
            ? 'text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]'
            : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
        }`}>
          {t.accessDenied}
        </h1>
        <p className={`text-lg mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {t.noPermissionMessage}
        </p>
        <Link 
          href="/dashboard" 
          className={`inline-flex items-center px-6 py-3 rounded-xl font-bold transition-all duration-300 border-2 ${
            darkMode
              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 border-yellow-500/40 hover:border-yellow-400'
              : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 hover:border-blue-700'
          } hover:scale-105 active:scale-95`}
        >
          {t.goToDashboard}
        </Link>
      </div>
    </div>
  );
}
