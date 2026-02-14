'use client';

import { useState } from 'react';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { clearToken } from '../lib/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import GlobalSearch from './GlobalSearch';

// Helper to get current section name from pathname
function getSectionName(pathname: string, t: any): string {
  if (pathname === '/dashboard') return t.dashboard || 'Bosh sahifa';
  if (pathname.startsWith('/admin/contracts')) return t.contracts || 'Contracts';
  if (pathname.startsWith('/admin/tenants')) return t.tenants || 'Tenants';
  if (pathname.startsWith('/admin/units')) return t.units || 'Office';
  if (pathname.startsWith('/admin/buildings')) return t.buildings || 'Buildings';
  if (pathname.startsWith('/admin/payments')) return t.payments || 'Payments';
  if (pathname.startsWith('/admin/invoices')) return t.invoices || 'Invoices';
  if (pathname.startsWith('/admin/reports')) return t.reports || 'Reports';
  if (pathname.startsWith('/admin/chat')) return t.chat || 'Chat';
  if (pathname.startsWith('/admin/notifications')) return t.notifications || 'Notifications';
  if (pathname.startsWith('/admin/telegram')) return 'Telegram Chat';
  if (pathname.startsWith('/admin/users')) return t.adminUsers || 'Admin Users';
  if (pathname.startsWith('/admin/activity')) return t.activityLogs || 'Activity Logs';
  if (pathname.startsWith('/admin/email-templates')) return t.emailTemplates || 'Email Templates';
  return 'Admin';
}

export default function GlobalHeader() {
  const t = useUntypedTranslations();
  const { theme, toggleTheme, darkMode } = useTheme();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAdminPage = pathname?.startsWith('/admin') || pathname === '/dashboard';
  const isLoginPage = pathname === '/login';

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  const currentSection = isAdminPage ? getSectionName(pathname || '', t) : '';

  return (
    <header className={`sticky top-0 z-50 w-full border-b shadow-sm ${
      darkMode 
        ? 'bg-black border-blue-600/30' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Current Section */}
          <div className="flex items-center gap-3">
            <Link 
              href={isAdminPage ? '/dashboard' : '/'} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src="/logo.png"
                alt="Darital Logo"
                width={28}
                height={28}
                className="object-contain"
                onError={(e) => {
                  // Hide image if it fails to load (file doesn't exist)
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className={`text-xl font-bold ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                Darital
              </span>
            </Link>
            {isAdminPage && currentSection && (
              <>
                <span className={darkMode ? 'text-blue-600/60' : 'text-gray-400'}>/</span>
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  {currentSection}
                </span>
              </>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Global Search - only on admin pages */}
            {isAdminPage && !isLoginPage && <GlobalSearch />}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-800' 
                  : 'hover:bg-gray-100'
              }`}
              aria-label={theme === 'light' ? t.darkMode : t.lightMode}
            >
              {theme === 'light' ? (
                <svg className={`w-5 h-5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* User Menu */}
            {user && !isLoginPage && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-800' 
                      : 'hover:bg-gray-100'
                  }`}
                  aria-label="User menu"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    darkMode ? 'bg-blue-500' : 'bg-blue-600'
                  }`}>
                    {user.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className={`hidden sm:inline text-sm font-medium ${
                    darkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    {user.fullName}
                  </span>
                  <svg className={`w-4 h-4 ${
                    darkMode ? 'text-blue-400' : 'text-gray-500'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border py-1 z-50 ${
                      darkMode 
                        ? 'bg-black border-blue-600/40' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className={`px-4 py-2 border-b ${
                        darkMode ? 'border-blue-600/30' : 'border-gray-200'
                      }`}>
                        <p className={`text-sm font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>{user.fullName}</p>
                        <p className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{user.email}</p>
                        <p className={`text-xs mt-1 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{user.role}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          darkMode
                            ? 'text-white hover:bg-blue-600/10'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {t.dashboard || 'Bosh sahifa'}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          darkMode
                            ? 'text-red-400 hover:bg-blue-600/10'
                            : 'text-red-600 hover:bg-gray-100'
                        }`}
                      >
                        {t.logout || 'Logout'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

