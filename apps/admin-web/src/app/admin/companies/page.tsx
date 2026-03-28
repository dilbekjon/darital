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
  tenantsCount: number;
  tenants: TenantSummary[];
  createdAt: string;
}

interface TenantSummary {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
}

export default function AdminCompaniesPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tenantIds: [] as string[],
  });
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');

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
          const [companiesData, tenantsData] = await Promise.all([
            fetchApi<Company[]>('/companies'),
            fetchApi<TenantSummary[]>('/tenants'),
          ]);
          setCompanies(companiesData);
          setTenants(tenantsData);
        } catch (err) {
          console.error('Failed to load companies:', err);
          if (err instanceof ApiError) setError(err.message);
          else setError('Kutilmagan xato yuz berdi.');
        } finally {
          setPageLoading(false);
        }
      };

      load();
    }
  }, [loading, user, hasPermission]);

  const filteredTenantOptions = useMemo(() => {
    const query = tenantSearchQuery.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((tenant) =>
      tenant.fullName.toLowerCase().includes(query) ||
      tenant.phone.toLowerCase().includes(query) ||
      (tenant.email || '').toLowerCase().includes(query),
    );
  }, [tenants, tenantSearchQuery]);

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => formData.tenantIds.includes(tenant.id)),
    [tenants, formData.tenantIds],
  );

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
    setFormData({ name: '', description: '', tenantIds: [] });
    setEditingCompany(null);
    setTenantSearchQuery('');
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
      tenantIds: company.tenants.map((tenant) => tenant.id),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const toggleTenant = (tenantId: string) => {
    setFormData((prev) => ({
      ...prev,
      tenantIds: prev.tenantIds.includes(tenantId)
        ? prev.tenantIds.filter((id) => id !== tenantId)
        : [...prev.tenantIds, tenantId],
    }));
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
            tenantIds: formData.tenantIds,
          }),
        });
        setCompanies((prev) => prev.map((c) => (c.id === editingCompany.id ? response : c)));
      } else {
        const response = await fetchApi<Company>('/companies', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || undefined,
            tenantIds: formData.tenantIds,
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
        setError('Kompaniyani saqlashda kutilmagan xato yuz berdi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!canDelete) return;
    if (
      !confirm(
        `Kompaniya "${company.name}" ni o'chirmoqchimisiz?\n\nBu faqat kompaniyaga xona yoki ijarachi biriktirilmagan bo'lsa ruxsat etiladi.`,
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
                    Ijarachilar
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
                      className={`px-6 py-4 text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {company.tenantsCount} ta
                        </span>
                        {company.tenants.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {company.tenants.slice(0, 3).map((tenant) => (
                              <span
                                key={tenant.id}
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                  darkMode ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {tenant.fullName}
                              </span>
                            ))}
                            {company.tenantsCount > 3 && (
                              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                +{company.tenantsCount - 3} ta
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                            Biriktirilmagan
                          </span>
                        )}
                      </div>
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
            className={`rounded-lg shadow-xl p-6 w-full max-w-4xl mx-auto border ${
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4">
              <div>
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
              <div>
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
                  <div className={`rounded-xl border p-4 ${darkMode ? 'border-blue-600/30 bg-blue-600/5' : 'border-blue-100 bg-blue-50/60'}`}>
                    <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Kompaniya nima qiladi?
                    </p>
                    <p className={`text-sm leading-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Bu yerda kompaniya bitta “super ijarachi” kabi ishlaydi: ichiga bir nechta ijarachini biriktirib, ularni bitta guruh sifatida boshqarasiz.
                    </p>
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${darkMode ? 'border-blue-600/30 bg-black/60' : 'border-gray-200 bg-gray-50/70'}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Guruhga qo‘shiladigan ijarachilar
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tanlangan ijarachilar shu kompaniya guruhiga biriktiriladi.
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      {formData.tenantIds.length} ta tanlandi
                    </span>
                  </div>

                  <div className="mb-3">
                    <input
                      type="text"
                      value={tenantSearchQuery}
                      onChange={(e) => setTenantSearchQuery(e.target.value)}
                      placeholder="Ism, telefon yoki email bo‘yicha qidiring"
                      className={`w-full rounded-lg border px-3 py-2 ${
                        darkMode
                          ? 'bg-black border-blue-600/30 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {selectedTenants.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedTenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          type="button"
                          onClick={() => toggleTenant(tenant.id)}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                            darkMode ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <span>{tenant.fullName}</span>
                          <span>×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`max-h-72 overflow-y-auto rounded-xl border ${darkMode ? 'border-blue-600/20' : 'border-gray-200'} divide-y ${darkMode ? 'divide-blue-600/20' : 'divide-gray-200'}`}>
                    {filteredTenantOptions.length === 0 ? (
                      <div className={`p-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Mos ijarachi topilmadi.
                      </div>
                    ) : (
                      filteredTenantOptions.map((tenant) => {
                        const checked = formData.tenantIds.includes(tenant.id);
                        return (
                          <label
                            key={tenant.id}
                            className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${
                              checked
                                ? darkMode
                                  ? 'bg-blue-600/10'
                                  : 'bg-blue-50'
                                : darkMode
                                  ? 'hover:bg-blue-600/5'
                                  : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTenant(tenant.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0">
                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {tenant.fullName}
                              </div>
                              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {tenant.phone}
                              </div>
                              {tenant.email && (
                                <div className={`truncate text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {tenant.email}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
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
