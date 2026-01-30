'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';
import DaritalLoader from '../../../components/DaritalLoader';

interface AuditLog {
  id: string;
  actorId: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  action: string;
  subject: string | null;
  meta: any;
  createdAt: string;
}

const actionIcons: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  login: '🔑',
  logout: '🚪',
  export: '📤',
  import: '📥',
  approve: '✅',
  reject: '❌',
  send: '📨',
  default: '📋',
};

const getActionLabel = (action: string, t: any): string => {
  switch (action) {
    case 'create': return t.actionCreate;
    case 'update': return t.actionUpdate;
    case 'delete': return t.actionDelete;
    case 'login': return t.actionLogin;
    case 'logout': return t.actionLogout;
    case 'export': return t.actionExport;
    case 'import': return t.actionImport;
    case 'approve': return t.actionApprove;
    case 'reject': return t.actionReject;
    case 'send': return t.actionSend;
    default: return action.charAt(0).toUpperCase() + action.slice(1);
  }
};

const actionColors: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-green-500/20', text: 'text-green-400' },
  update: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  delete: { bg: 'bg-red-500/20', text: 'text-red-400' },
  login: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  approve: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  default: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

export default function ActivityLogsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    const loadLogs = async () => {
      if (!user || !hasPermission('audit.read')) {
        console.warn('User does not have permission to view audit logs');
        setPageLoading(false);
        return;
      }

      try {
        const response = await fetchApi<{ data: AuditLog[]; pagination: any }>('/audit-logs?limit=200');
        // Backend returns { data: [...], pagination: {...} }
        setLogs(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        if (err instanceof ApiError) {
          setError(`Failed to load audit logs: ${err.message}`);
        } else {
          setError('Failed to load audit logs. Please check your connection and try again.');
        }
      } finally {
        setPageLoading(false);
      }
    };

    if (!loading) {
      loadLogs();
    }
  }, [loading, user, hasPermission]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          log.actor?.fullName?.toLowerCase().includes(query) ||
          log.actor?.email?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.subject?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Action filter
      if (actionFilter && !log.action.toLowerCase().includes(actionFilter.toLowerCase())) {
        return false;
      }

      // Date filter
      if (dateFilter) {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0];
        if (logDate !== dateFilter) return false;
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter, dateFilter]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action.split('.')[0]));
    return Array.from(actions).sort();
  }, [logs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const d = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
  };

  const getActionIcon = (action: string) => {
    const key = action.split('.')[0].toLowerCase();
    return actionIcons[key] || actionIcons.default;
  };

  const getActionColor = (action: string) => {
    const key = action.split('.')[0].toLowerCase();
    return actionColors[key] || actionColors.default;
  };

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('audit.read')) {
    return <NoAccess />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t.dashboard, href: '/dashboard' },
            { label: t.activityLogs || 'Activity Logs' },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            📋 {t.activityLogs || 'Faollik jurnali'}
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {t.activityLogsDesc || 'Barcha admin harakatlari va tizim hodisalarini kuzatib boring'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg border ${
            darkMode
              ? 'bg-red-900/20 border-red-800 text-red-300'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          className={`rounded-xl border p-4 mb-6 ${
            darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchLogs || 'Jurnallarni qidirish...'}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <svg
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className={`px-4 py-2 rounded-xl border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">{t.allActions || 'Barcha harakatlar'}</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action, t)}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`px-4 py-2 rounded-xl border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Results count */}
          <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {filteredLogs.length} {t.logsFound || 'logs found'}
            {(searchQuery || actionFilter || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActionFilter('');
                  setDateFilter('');
                }}
                className={`ml-4 ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {t.clearFilters || 'Filtrlarni tozalash'}
              </button>
            )}
          </div>
        </div>

        {/* Logs List */}
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<span className="text-6xl">📋</span>}
            title={t.noLogs || 'No activity logs'}
            description={
              searchQuery || actionFilter || dateFilter
                ? 'No logs match your current filters. Try adjusting your search criteria.'
                : 'Activity logs will appear here when admins perform actions like creating tenants, updating contracts, or processing payments.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const color = getActionColor(log.action);
              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                    darkMode
                      ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${color.bg}`}
                    >
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}
                          >
                            {log.actor?.fullName || 'Unknown User'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text}`}
                          >
                            {getActionLabel(log.action, t)}
                          </span>
                        </div>
                        <span
                          className={`text-sm flex-shrink-0 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {/* Details */}
                      <div className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {log.subject && (
                          <span>
                            {t.subject || 'Subject'}: <code className="font-mono">{log.subject}</code>
                          </span>
                        )}
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer hover:text-blue-500">
                              {t.viewDetails || 'Tafsilotlarni ko\'rish'}
                            </summary>
                            <pre
                              className={`mt-2 p-2 rounded-lg text-xs overflow-x-auto ${
                                darkMode ? 'bg-gray-800' : 'bg-gray-100'
                              }`}
                            >
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>

                      {/* Actor info */}
                      <div
                        className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                      >
                        {log.actor?.email} • {log.actor?.role}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
