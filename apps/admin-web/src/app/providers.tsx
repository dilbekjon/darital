'use client';

import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import GlobalHeader from '../components/GlobalHeader';
import { AdminSidebar } from '../components/AdminSidebar';
import { usePathname } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemeWrapper>{children}</ThemeWrapper>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Create a wrapper component to access AuthContext and ThemeContext
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { darkMode } = useTheme();
  const pathname = usePathname();

  // Determine if we should show the admin sidebar
  const showAdminSidebar = user && !loading && user.role !== 'TENANT_USER' && !pathname.startsWith('/login');

  return (
    <LanguageProvider>
      <ToastProvider>
        <GlobalHeader />
        {showAdminSidebar ? (
          <div className={`flex min-h-screen ${
            darkMode ? 'bg-black' : 'bg-gray-100'
          }`}>
            <AdminSidebar />
            <main className="flex-1">{children}</main>
          </div>
        ) : (
          <main className="flex-1">{children}</main>
        )}
      </ToastProvider>
    </LanguageProvider>
  );
}

