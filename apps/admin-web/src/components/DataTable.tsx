'use client';

import React, { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchFields?: string[];
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  emptyMessage,
  searchPlaceholder,
  searchFields = [],
}: DataTableProps<T>) {
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.size === filteredData.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredData.map((item) => item[keyField])));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || searchFields.length === 0) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const allSelected = sortedData.length > 0 && selectedIds.size === sortedData.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedData.length;

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchFields.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder || t.search || 'Search...'}
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
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {sortedData.length} {t.results || 'results'}
          </span>
        </div>
      )}

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    } ${column.sortable ? 'cursor-pointer hover:text-blue-500' : ''}`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && sortKey === column.key && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className={`px-4 py-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {emptyMessage || t.noData || 'No data available'}
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => {
                  const id = item[keyField];
                  const isSelected = selectedIds.has(id);

                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(item)}
                      className={`transition-colors ${
                        isSelected
                          ? darkMode
                            ? 'bg-blue-500/10'
                            : 'bg-blue-50'
                          : darkMode
                          ? 'hover:bg-gray-800/50'
                          : 'hover:bg-gray-50'
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {selectable && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          {column.render ? column.render(item) : item[column.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
