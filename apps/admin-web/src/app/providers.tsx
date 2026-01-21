'use client';

import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import GlobalHeader from '../components/GlobalHeader';
import { AdminSidebar } from '../components/AdminSidebar';
import CommandPalette from '../components/CommandPalette';
import HelpModal from '../components/HelpModal';
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
          <div className={`flex h-[calc(100vh-56px)] ${
            darkMode ? 'bg-black' : 'bg-gray-100'
          }`}>
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto">{children}</main>
        )}
        {/* Global keyboard shortcuts */}
        {showAdminSidebar && (
          <>
            <CommandPalette />
            <HelpModal />
          </>
        )}
      </ToastProvider>
    </LanguageProvider>
  );
}

