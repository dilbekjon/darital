'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUntypedTranslations } from '../i18n/useUntypedTranslations';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const HelpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode } = useTheme();
  const t = useUntypedTranslations();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t.navigation || 'Navigation',
      shortcuts: [
        { keys: ['⌘', 'K'], description: t.openCommandPalette || 'Open command palette' },
        { keys: ['G', 'D'], description: t.goToDashboard || 'Go to Dashboard' },
        { keys: ['G', 'T'], description: t.goToTenants || 'Go to Tenants' },
        { keys: ['G', 'U'], description: t.goToUnits || 'Go to Units' },
        { keys: ['G', 'C'], description: t.goToContracts || 'Go to Contracts' },
        { keys: ['G', 'P'], description: t.goToPayments || 'Go to Payments' },
      ],
    },
    {
      title: t.actions || 'Actions',
      shortcuts: [
        { keys: ['N'], description: t.createNew || 'Create new item' },
        { keys: ['E'], description: t.edit || 'Edit selected item' },
        { keys: ['Delete'], description: t.delete || 'Delete selected item' },
        { keys: ['⌘', 'S'], description: t.save || 'Save changes' },
        { keys: ['⌘', 'Enter'], description: t.submit || 'Submit form' },
      ],
    },
    {
      title: t.interface || 'Interface',
      shortcuts: [
        { keys: ['?'], description: t.showHelp || 'Show this help' },
        { keys: ['Esc'], description: t.closeModal || 'Close modal / Cancel' },
        { keys: ['/'], description: t.focusSearch || 'Focus search' },
        { keys: ['T'], description: t.toggleTheme || 'Toggle dark/light mode' },
      ],
    },
    {
      title: t.tableNavigation || 'Table Navigation',
      shortcuts: [
        { keys: ['↑', '↓'], description: t.navigateRows || 'Navigate rows' },
        { keys: ['Space'], description: t.selectRow || 'Select/deselect row' },
        { keys: ['⌘', 'A'], description: t.selectAll || 'Select all' },
        { keys: ['⌘', 'Shift', 'A'], description: t.deselectAll || 'Deselect all' },
      ],
    },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open help with ? key (Shift + /)
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }

    // Close on Escape
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 flex items-center justify-between px-6 py-4 border-b ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              ⌨️ {t.keyboardShortcuts || 'Keyboard Shortcuts'}
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t.shortcutsDesc || 'Use these shortcuts to work faster'}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {group.title}
                </h3>
                <div className="space-y-3">
                  {group.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd
                              className={`px-2 py-1 rounded text-xs font-mono min-w-[28px] text-center ${
                                darkMode
                                  ? 'bg-gray-800 text-gray-300 border border-gray-700'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 px-6 py-4 border-t text-center ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {t.pressQuestion || 'Press'} <kbd className={`px-2 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>?</kbd> {t.toToggleHelp || 'anytime to toggle this help'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
