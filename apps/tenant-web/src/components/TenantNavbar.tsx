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

  return (
    <nav className={`${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-b sticky top-0 z-10`} style={{
      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/tenant')}
              className={`text-xl font-bold ${
                darkMode ? 'text-yellow-400' : 'text-blue-600'
              }`}
            >
              {darkMode && '✨ '}Darital
            </button>
          </div>

          {/* Right side: Theme, User */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? 'bg-yellow-600 text-black hover:bg-yellow-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {user.fullName || user.email}
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

