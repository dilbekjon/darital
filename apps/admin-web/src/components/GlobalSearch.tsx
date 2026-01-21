'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchApi } from '../lib/api';

interface SearchResult {
  type: 'tenant' | 'unit' | 'contract' | 'invoice' | 'payment';
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
}

const GlobalSearch: React.FC = () => {
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search function with debounce
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search tenants
      const tenants = await fetchApi('/tenants').catch(() => []);
      const filteredTenants = (Array.isArray(tenants) ? tenants : [])
        .filter((t: any) =>
          t.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.phone?.includes(searchQuery)
        )
        .slice(0, 3);
      
      filteredTenants.forEach((tenant: any) => {
        searchResults.push({
          type: 'tenant',
          id: tenant.id,
          title: tenant.fullName,
          subtitle: tenant.email || tenant.phone,
          icon: '👤',
          href: `/admin/tenants?search=${encodeURIComponent(tenant.fullName)}`,
        });
      });

      // Search units
      const units = await fetchApi('/units').catch(() => []);
      const filteredUnits = (Array.isArray(units) ? units : [])
        .filter((u: any) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 3);
      
      filteredUnits.forEach((unit: any) => {
        searchResults.push({
          type: 'unit',
          id: unit.id,
          title: unit.name,
          subtitle: `${unit.status} • ${Number(unit.price).toLocaleString()} UZS`,
          icon: '🏠',
          href: `/admin/units?search=${encodeURIComponent(unit.name)}`,
        });
      });

      // Search contracts
      const contractsRes = await fetchApi<{ data?: any[] } | any[]>('/contracts').catch(() => ({ data: [] }));
      const contracts = Array.isArray(contractsRes) ? contractsRes : (contractsRes.data || []);
      const filteredContracts = contracts
        .filter((c: any) =>
          c.tenant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.unit?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.id?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 3);
      
      filteredContracts.forEach((contract: any) => {
        searchResults.push({
          type: 'contract',
          id: contract.id,
          title: `${contract.tenant?.fullName || 'Unknown'} - ${contract.unit?.name || 'Unknown'}`,
          subtitle: `${contract.status} • ${Number(contract.amount).toLocaleString()} UZS/month`,
          icon: '📄',
          href: `/admin/contracts?search=${encodeURIComponent(contract.tenant?.fullName || '')}`,
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
          darkMode
            ? 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
            : 'bg-gray-100 border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">{t.search || 'Search'}...</span>
        <kbd className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
          darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-500'
        }`}>
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm">
          <div
            ref={containerRef}
            className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${
              darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'
            }`}
          >
            {/* Search Input */}
            <div className={`flex items-center gap-3 p-4 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <svg className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t.searchPlaceholder || 'Search tenants, units, contracts...'}
                className={`flex-1 bg-transparent outline-none text-lg ${
                  darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                }`}
              />
              {loading && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-800 text-gray-400' : ''}`}
              >
                <span className="text-sm">ESC</span>
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim() && results.length === 0 && !loading ? (
                <div className="p-8 text-center">
                  <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t.noResultsFound || 'No results found'}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t.tryDifferentSearch || 'Try a different search term'}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        index === selectedIndex
                          ? darkMode ? 'bg-blue-500/20' : 'bg-blue-50'
                          : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{result.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {result.title}
                        </p>
                        <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {result.subtitle}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {result.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Links */}
              {!query.trim() && (
                <div className="p-4">
                  <p className={`text-xs font-medium uppercase mb-3 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {t.quickLinks || 'Quick Links'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t.tenants || 'Tenants', href: '/admin/tenants', icon: '👤' },
                      { label: t.units || 'Units', href: '/admin/units', icon: '🏠' },
                      { label: t.contracts || 'Contracts', href: '/admin/contracts', icon: '📄' },
                      { label: t.payments || 'Payments', href: '/admin/payments', icon: '💰' },
                      { label: t.invoices || 'Invoices', href: '/admin/invoices', icon: '🧾' },
                      { label: t.buildings || 'Buildings', href: '/admin/buildings', icon: '🏢' },
                    ].map((link) => (
                      <button
                        key={link.href}
                        onClick={() => {
                          router.push(link.href);
                          setIsOpen(false);
                        }}
                        className={`flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                          darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>{link.icon}</span>
                        <span>{link.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-4 py-3 border-t text-xs ${
              darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
            }`}>
              <div className="flex items-center gap-4">
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
              <span>{t.poweredByDarital || 'Darital Search'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;
