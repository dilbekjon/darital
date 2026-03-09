'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

export default function TenantNavbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    // logout() already handles redirect, but we can use window.location for full reload
    window.location.href = '/login';
  };

  if (!user) return null;

  const initials = (user.fullName || user.email || 'U')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className={`${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-b sticky top-0 z-10`} style={{
      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none'
    }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => router.push('/tenant')}
              className={`text-lg sm:text-xl font-bold truncate min-h-[44px] flex items-center ${
                darkMode ? 'text-yellow-400' : 'text-blue-600'
              }`}
            >
              {darkMode && '✨ '}Darital
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                darkMode
                  ? 'bg-yellow-600 text-black hover:bg-yellow-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <NotificationCenter />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-4 sm:py-2 flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  darkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="sm:hidden w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  {initials}
                </span>
                <span className="hidden sm:inline truncate max-w-[120px]">
                  {user.fullName || user.email}
                </span>
              </button>
              {showUserMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                      darkMode
                        ? 'text-red-400 hover:bg-gray-700'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

