'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';

interface Company {
  id: string;
  name: string;
  description?: string | null;
  unitsCount: number;
  createdAt: string;
}

export default function AdminCompaniesPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q),
    );
  }, [companies, searchQuery]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('companies.read')) {
        setPageLoading(false);
        return;
      }

      const load = async () => {
        try {
          const data = await fetchApi<Company[]>('/companies');
          setCompanies(data);
        } catch (err) {
          console.error('Failed to load companies:', err);
          if (err instanceof ApiError) setError(err.message);
          else setError('An unexpected error occurred.');
        } finally {
          setPageLoading(false);
        }
      };

      load();
    }
  }, [loading, user, hasPermission]);

  if (loading || pageLoading) {
    return (
      <div
        className={`flex flex-1 items-center justify-center min-h-screen ${
          darkMode ? 'bg-black' : 'bg-gray-100'
        }`}
      >
        <div
          className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
            darkMode ? 'border-blue-500' : 'border-blue-500'
          }`}
        />
      </div>
    );
  }

  if (!user || !hasPermission('companies.read')) {
    return <NoAccess />;
  }

  const canCreateOrUpdate = hasPermission('companies.create') || hasPermission('companies.update');
  const canDelete = hasPermission('companies.delete');

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCompany(null);
  };

  const openCreateModal = () => {
    resetForm();
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateOrUpdate) return;

    setSubmitting(true);
    setError(null);

    try {
      if (editingCompany) {
        const response = await fetchApi<Company>(`/companies/${editingCompany.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || undefined,
          }),
        });
        setCompanies((prev) => prev.map((c) => (c.id === editingCompany.id ? response : c)));
      } else {
        const response = await fetchApi<Company>('/companies', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || undefined,
          }),
        });
        setCompanies((prev) => [response, ...prev]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save company:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('An unexpected error occurred while saving company.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!canDelete) return;
    if (
      !confirm(
        `Kompaniya "${company.name}" ni o'chirmoqchimisiz?\n\nBu faqat kompaniyaga birorta ham xona biriktirilmagan bo'lsa ruxsat etiladi.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await fetchApi(`/companies/${company.id}`, {
        method: 'DELETE',
      });
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    } catch (err) {
      console.error('Failed to delete company:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('Kompaniyani o\'chirishda xato.');
      }
    }
  };

  return (
    <div
      className={`p-4 sm:p-6 lg:p-8 min-h-screen ${
        darkMode ? 'bg-black' : 'bg-gray-100'
      }`}
    >
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Bosh sahifa', href: '/dashboard' },
          { label: (t as any).companies || 'Kompaniyalar' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {(t as any).companies || 'Kompaniyalar'}
          </h1>
          <p
            className={`text-sm mt-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {(t as any).manageCompanies ||
              'Bir nechta xonani birlashtira oladigan kompaniyalarni boshqarish'}
          </p>
        </div>
        {canCreateOrUpdate && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {(t as any).createCompany || 'Kompaniya yaratish'}
          </button>
        )}
      </div>

      {error && (
        <div
          className={`px-4 py-3 rounded-lg mb-4 border ${
            darkMode
              ? 'bg-red-900/20 border-red-800 text-red-300'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}
          role="alert"
        >
          {error}
        </div>
      )}

      {companies.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
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
            <input
              type="text"
              placeholder={
                (t as any).searchCompanies || 'Kompaniyani nomi bo\'yicha qidirish...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
        </div>
      )}

      <div
        className={`shadow-md rounded-lg overflow-hidden border ${
          darkMode
            ? 'bg-black border-blue-600/30'
            : 'bg-white border-gray-200'
        }`}
      >
        {filteredCompanies.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className={`w-16 h-16 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 21h18M4 10h16M9 3h6v7H9zM5 10v11h4V10zm10 0v11h4V10z"
                />
              </svg>
            }
            title={
              companies.length === 0
                ? (t as any).noCompanies || 'Kompaniyalar yo\'q'
                : t.noResultsFound
            }
            description={
              companies.length === 0
                ? (t as any).getStartedByCreatingCompany ||
                  'Avval birinchi kompaniyangizni yarating.'
                : t.tryAdjustingFilters
            }
            actionLabel={
              companies.length === 0 && canCreateOrUpdate
                ? (t as any).createCompany || 'Kompaniya yaratish'
                : undefined
            }
            onAction={
              companies.length === 0 && canCreateOrUpdate
                ? openCreateModal
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`min-w-full divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}
            >
              <thead
                className={`sticky top-0 ${
                  darkMode
                    ? 'bg-black border-b border-blue-600/30'
                    : 'bg-gray-50'
                }`}
              >
                <tr>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {(t as any).companyName || 'Kompaniya nomi'}
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {t.description || 'Tavsif'}
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {(t as any).unitsCount || 'Xonalar'}
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {t.createdAt || 'Yaratilgan sana'}
                  </th>
                  {(canCreateOrUpdate || canDelete) && (
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {t.actions || 'Amallar'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody
                className={`${
                  darkMode ? 'bg-black' : 'bg-white'
                } divide-y ${
                  darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
                }`}
              >
                {filteredCompanies.map((company, index) => (
                  <tr
                    key={company.id}
                    className={`transition-colors ${
                      index % 2 === 0
                        ? darkMode
                          ? 'bg-black'
                          : 'bg-white'
                        : darkMode
                        ? 'bg-blue-600/5'
                        : 'bg-gray-50'
                    } ${
                      darkMode
                        ? 'hover:bg-blue-600/10'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {company.name}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {company.description || (
                        <span
                          className={
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }
                        >
                          {(t as any).noDescription || 'Tavsif yo\'q'}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {company.unitsCount}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {new Date(company.createdAt).toLocaleDateString(
                        'en-GB',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        },
                      )}
                    </td>
                    {(canCreateOrUpdate || canDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          {canCreateOrUpdate && (
                            <button
                              onClick={() => openEditModal(company)}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-blue-600 hover:text-blue-900'
                              }`}
                            >
                              {t.edit || 'Tahrirlash'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(company)}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-red-600 hover:text-red-900'
                              }`}
                            >
                              {t.delete || 'O\'chirish'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
            darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
          }`}
        >
          <div
            className={`rounded-lg shadow-xl p-6 w-full max-w-md mx-auto border ${
              darkMode
                ? 'bg-black border-blue-600/30'
                : 'bg-white border-gray-200'
            }`}
          >
            <h2
              className={`text-xl font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {editingCompany
                ? (t as any).editCompany || 'Kompaniyani tahrirlash'
                : (t as any).createCompany || 'Kompaniya yaratish'}
            </h2>
            {error && (
              <div
                className={`px-4 py-3 rounded-lg mb-4 border ${
                  darkMode
                    ? 'bg-red-900/20 border-red-800 text-red-300'
                    : 'bg-red-100 border-red-400 text-red-700'
                }`}
                role="alert"
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {(t as any).companyName || 'Kompaniya nomi'} *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode
                      ? 'bg-black border-blue-600/30 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Masalan, Darital Group"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {t.description || 'Tavsif'}
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode
                      ? 'bg-black border-blue-600/30 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder={
                    (t as any).companyDescriptionPlaceholder ||
                    'Ixtiyoriy tavsif yoki izoh'
                  }
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    darkMode
                      ? 'bg-blue-600/20 text-white hover:bg-blue-600/30'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
