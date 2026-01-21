'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';
import { useAuth } from '../contexts/AuthContext';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { darkMode, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useUntypedTranslations();
  const { hasPermission } = useAuth();

  // Define all commands
  const allCommands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard', title: t.dashboard || 'Dashboard', icon: '🏠', action: () => router.push('/dashboard'), keywords: ['home', 'main'], shortcut: 'G D' },
    { id: 'nav-tenants', title: t.tenants || 'Tenants', icon: '👥', action: () => router.push('/admin/tenants'), keywords: ['users', 'residents'] },
    { id: 'nav-units', title: t.units || 'Units', icon: '🏢', action: () => router.push('/admin/units'), keywords: ['apartments', 'rooms'] },
    { id: 'nav-contracts', title: t.contracts || 'Contracts', icon: '📄', action: () => router.push('/admin/contracts'), keywords: ['lease', 'agreements'] },
    { id: 'nav-invoices', title: t.invoices || 'Invoices', icon: '📋', action: () => router.push('/admin/invoices'), keywords: ['bills'] },
    { id: 'nav-payments', title: t.payments || 'Payments', icon: '💰', action: () => router.push('/admin/payments'), keywords: ['transactions', 'money'] },
    { id: 'nav-chat', title: t.chat || 'Chat', icon: '💬', action: () => router.push('/admin/chat'), keywords: ['messages', 'support'] },
    { id: 'nav-reports', title: t.reports || 'Reports', icon: '📊', action: () => router.push('/admin/reports'), keywords: ['analytics', 'stats'] },
    { id: 'nav-buildings', title: t.buildings || 'Buildings', icon: '🏗️', action: () => router.push('/admin/buildings'), keywords: ['properties'] },
    { id: 'nav-notifications', title: t.notifications || 'Notifications', icon: '🔔', action: () => router.push('/admin/notifications'), keywords: ['alerts'] },
    { id: 'nav-users', title: t.adminUsers || 'Admin Users', icon: '👤', action: () => router.push('/admin/users'), keywords: ['admins', 'staff'] },
    { id: 'nav-activity', title: t.activityLogs || 'Activity Logs', icon: '📋', action: () => router.push('/admin/activity'), keywords: ['audit', 'history'] },
    { id: 'nav-email-templates', title: t.emailTemplates || 'Email Templates', icon: '📧', action: () => router.push('/admin/email-templates'), keywords: ['email', 'templates'] },

    // Actions
    { id: 'action-new-tenant', title: t.addTenant || 'Add New Tenant', subtitle: t.createNew || 'Create new', icon: '➕', action: () => router.push('/admin/tenants?action=new'), keywords: ['create', 'add'] },
    { id: 'action-new-contract', title: t.addContract || 'Add New Contract', subtitle: t.createNew || 'Create new', icon: '➕', action: () => router.push('/admin/contracts?action=new'), keywords: ['create', 'add'] },
    
    // Theme
    { id: 'theme-toggle', title: darkMode ? (t.lightMode || 'Light Mode') : (t.darkMode || 'Dark Mode'), icon: darkMode ? '☀️' : '🌙', action: toggleTheme, keywords: ['theme', 'appearance'] },
    
    // Language
    { id: 'lang-uz', title: "O'zbek tili", subtitle: 'Change language', icon: '🇺🇿', action: () => setLanguage('uz'), keywords: ['language', 'uzbek'] },
    { id: 'lang-ru', title: 'Русский язык', subtitle: 'Change language', icon: '🇷🇺', action: () => setLanguage('ru'), keywords: ['language', 'russian'] },
    { id: 'lang-en', title: 'English', subtitle: 'Change language', icon: '🇬🇧', action: () => setLanguage('en'), keywords: ['language'] },

    // Quick Actions
    { id: 'action-export-tenants', title: t.exportTenants || 'Export Tenants', subtitle: 'Download CSV', icon: '📤', action: () => window.open('/api/exports/tenants', '_blank'), keywords: ['download', 'csv'] },
    { id: 'action-export-payments', title: t.exportPayments || 'Export Payments', subtitle: 'Download CSV', icon: '📤', action: () => window.open('/api/exports/payments', '_blank'), keywords: ['download', 'csv'] },
  ];

  // Filter commands based on query
  const filteredCommands = query.trim()
    ? allCommands.filter((cmd) => {
        const searchStr = `${cmd.title} ${cmd.subtitle || ''} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
      })
    : allCommands;

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Open command palette with "/"
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      if (!isOpen) return;

      // Navigate with arrow keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
          setQuery('');
        }
      }
    },
    [isOpen, filteredCommands, selectedIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Search Input */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <svg
            className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchCommands || 'Search commands...'}
            className={`flex-1 bg-transparent outline-none text-lg ${
              darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
            }`}
          />
          <kbd className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className={`py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t.noResults || 'No results found'}
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                  setQuery('');
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  index === selectedIndex
                    ? darkMode
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-blue-50 text-blue-700'
                    : darkMode
                    ? 'hover:bg-gray-800 text-gray-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-xl">{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{cmd.title}</p>
                  {cmd.subtitle && (
                    <p className={`text-sm truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {cmd.subtitle}
                    </p>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>↑</kbd>
              <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>↓</kbd>
              {t.toNavigate || 'to navigate'}
            </span>
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>↵</kbd>
              {t.toSelect || 'to select'}
            </span>
          </div>
          <span className="text-xs">/ {t.toOpenCommands || 'for commands'}</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
