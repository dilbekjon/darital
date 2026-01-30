import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';
import { useTheme } from '../contexts/ThemeContext';
import { useUnreadChatCount } from '../hooks/useUnreadChatCount';
import { usePendingPaymentsCount } from '../hooks/usePendingPaymentsCount';

interface SidebarMenuItem {
  label: string;
  href: string;
  permissionCodes: string[];
  icon: React.ReactNode;
  section?: string; // Group items by section
}

interface SidebarSection {
  title: string;
  items: SidebarMenuItem[];
}

export function AdminSidebar() {
  const { hasPermission, user, loading } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { count: unreadCount } = useUnreadChatCount();
  const { count: pendingPaymentsCount } = usePendingPaymentsCount();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Define menu items grouped by sections
  const allMenuItems: SidebarMenuItem[] = [
    // Insights
    { 
      label: t.dashboard, 
      href: '/dashboard', 
      permissionCodes: [],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      section: 'insights',
    },
    {
      label: t.reports,
      href: '/admin/reports',
      permissionCodes: ['reports.view'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      section: 'insights',
    },
    // Operations
    {
      label: t.contracts,
      href: '/admin/contracts',
      permissionCodes: ['contracts.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      section: 'operations',
    },
    {
      label: t.tenants,
      href: '/admin/tenants',
      permissionCodes: ['tenants.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2.586a1 1 0 00-.707.293L12 7.707l-2.707-2.707A1 1 0 008.586 5H7a2 2 0 00-2 2v11a2 2 0 002 2h2m4 0h2a2 2 0 002-2v-7a2 2 0 00-2-2h-2m-4 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-4 0a5 5 0 0110 0v2a5 5 0 01-10 0V7a2 2 0 00-2-2H3a2 2 0 00-2 2v11a2 2 0 002 2h2" />
        </svg>
      ),
      section: 'operations',
    },
    {
      label: t.units || 'Units',
      href: '/admin/units',
      permissionCodes: ['units.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      section: 'operations',
    },
    {
      label: t.buildings || 'Buildings',
      href: '/admin/buildings',
      permissionCodes: ['buildings.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      section: 'operations',
    },
    {
      label: t.payments,
      href: '/admin/payments',
      permissionCodes: ['payments.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      section: 'operations',
    },
    {
      label: t.invoices || 'Invoices',
      href: '/admin/invoices',
      permissionCodes: ['invoices.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      section: 'operations',
    },
    // Communication
    {
      label: t.chat,
      href: '/admin/chat',
      permissionCodes: ['chat.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      section: 'communication',
    },
    {
      label: t.notifications,
      href: '/admin/notifications',
      permissionCodes: ['notifications.manage'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17l-3 3m0 0l-3-3m3 3V10a4 4 0 00-4-4H4m0 0l-3 3m3-3l3 3m10 0l-3 3m0 0l-3-3m3 3V10a4 4 0 00-4-4H4" />
        </svg>
      ),
      section: 'communication',
    },
    {
      label: 'Telegram Chat',
      href: '/admin/telegram',
      permissionCodes: ['notifications.manage'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      section: 'communication',
    },
    {
      label: t.emailTemplates || 'Email Templates',
      href: '/admin/email-templates',
      permissionCodes: ['notifications.manage'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      section: 'communication',
    },
    // Administration
    {
      label: t.adminUsers,
      href: '/admin/users',
      permissionCodes: ['admin.users.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2.586a1 1 0 00-.707.293L12 7.707l-2.707-2.707A1 1 0 008.586 5H7a2 2 0 00-2 2v11a2 2 0 002 2h2m4 0h2a2 2 0 002-2v-7a2 2 0 00-2-2h-2m-4 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-4 0a5 5 0 0110 0v2a5 5 0 01-10 0V7a2 2 0 00-2-2H3a2 2 0 00-2 2v11a2 2 0 002 2h2" />
        </svg>
      ),
      section: 'administration',
    },
    {
      label: t.activityLogs || 'Activity Logs',
      href: '/admin/activity',
      permissionCodes: ['audit.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      section: 'administration',
    },
    {
      label: 'Archive Management',
      href: '/admin/archive',
      permissionCodes: ['admin.users.read'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      section: 'administration',
    },
    // Dev Tools (only show in development)
    ...(typeof window !== 'undefined' && process.env.NODE_ENV !== 'production'
      ? [
          {
            label: 'Dev QA', // Keep as is - dev tool
            href: '/admin/dev/qa',
            permissionCodes: ['payments.read'],
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            section: 'administration',
          },
        ]
      : []),
  ];

  // Filter items based on user permissions
  const visibleMenuItems = allMenuItems.filter(item => {
    const hasPerms = item.permissionCodes.every(perm => hasPermission(perm));
    // Hide Chat tab for PAYMENT_COLLECTOR (tolovyiguvchi)
    if (item.href === '/admin/chat' && user?.role === 'PAYMENT_COLLECTOR') return false;
    return hasPerms;
  });

  // Group items by section
  const sections: Record<string, SidebarMenuItem[]> = {
    insights: [],
    operations: [],
    communication: [],
    administration: [],
  };

  visibleMenuItems.forEach(item => {
    const section = item.section || 'operations';
    if (sections[section]) {
      sections[section].push(item);
    }
  });

  // Section titles
  const sectionTitles: Record<string, string> = {
    insights: t.insights,
    operations: t.operations,
    communication: t.communication,
    administration: t.administration,
  };

  if (loading || !user || user.role === 'TENANT_USER') {
    return null;
  }

  const sidebarContent = (
    <div className="p-4">
      <div className={`text-xl font-bold mb-6 ${
        darkMode ? 'text-blue-400' : 'text-gray-900'
      }`}>{t.adminPanel}</div>
      <nav>
        {Object.entries(sections).map(([sectionKey, items]) => {
          if (items.length === 0) return null;
          
          return (
            <div key={sectionKey} className="mb-6">
              <p className={`px-4 text-xs font-semibold mt-6 mb-2 uppercase tracking-wide ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {sectionTitles[sectionKey]}
              </p>
              <ul>
                {items.map((item) => {
                  // Check if this is the chat item and has unread messages
                  const isChatItem = item.href === '/admin/chat';
                  const isPaymentsItem = item.href === '/admin/payments';
                  const showChatBadge = isChatItem && unreadCount > 0;
                  const showPaymentsBadge = isPaymentsItem && pendingPaymentsCount > 0;
                  const showBadge = showChatBadge || showPaymentsBadge;
                  const badgeCount = showChatBadge ? unreadCount : (showPaymentsBadge ? pendingPaymentsCount : 0);

                  return (
                    <li key={item.href} className="mb-1">
                      <Link 
                        href={item.href} 
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 py-2 px-4 rounded-lg transition-colors relative
                          ${pathname === item.href 
                            ? (darkMode 
                                ? 'bg-blue-600/30 text-blue-400 border border-blue-600/50' 
                                : 'bg-blue-600 text-white')
                            : (darkMode
                                ? 'hover:bg-blue-600/10 text-white'
                                : 'hover:bg-gray-100 text-gray-700')
                          }
                        `}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {showBadge && (
                          <span className={`
                            flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                            ${pathname === item.href
                              ? darkMode
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-blue-600'
                              : darkMode
                                ? 'bg-yellow-500 text-white'
                                : 'bg-yellow-500 text-white'
                            }
                          `}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`lg:hidden fixed top-[57px] left-4 z-50 p-2 rounded-lg transition-colors shadow-lg ${
          darkMode 
            ? 'bg-black text-blue-400 hover:bg-blue-600/10 border border-blue-600/30' 
            : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
        }`}
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay - dimmed backdrop so content on the right stays visible */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar - Desktop: Always visible, Mobile: Slide-over */}
      <aside
        className={`
          w-64 h-screen overflow-y-auto
          lg:translate-x-0 transition-transform duration-300 ease-in-out z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static lg:sticky lg:top-0
          ${darkMode 
            ? 'bg-black text-white border-r border-blue-600/30' 
            : 'bg-white text-gray-900 border-r border-gray-200'
          }
        `}
        style={{ top: isMobileOpen ? 0 : undefined }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
