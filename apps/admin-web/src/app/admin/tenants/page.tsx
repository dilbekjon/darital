'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';

interface Tenant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
}

export default function AdminTenantsPage() {
  const { user, loading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter tenants based on search query
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const query = searchQuery.toLowerCase();
    return tenants.filter(
      (tenant) =>
        tenant.fullName.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.phone.toLowerCase().includes(query)
    );
  }, [tenants, searchQuery]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('tenants.read')) {
        setPageLoading(false);
        return;
      }

      const loadTenants = async () => {
        try {
          const data = await fetchApi<Tenant[]>('/tenants');
          setTenants(data);
        } catch (err) {
          console.error('Failed to load tenants:', err);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred.');
          }
        } finally {
          setPageLoading(false);
        }
      };
      loadTenants();
    }
  }, [loading, user, hasPermission]);

  if (loading || pageLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !hasPermission('tenants.read')) {
    return <NoAccess />;
  }

  const canCreateTenants = hasPermission('tenants.create');
  const canEditTenants = hasPermission('tenants.update');
  const canDeleteTenants = hasPermission('tenants.delete');

  const handleDeleteTenant = async (tenantId: string) => {
    if (!canDeleteTenants) return;
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      await fetchApi(`/tenants/${tenantId}`, {
        method: 'DELETE',
      });
      
      setTenants((prev) => prev.filter((tenant) => tenant.id !== tenantId));
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('Failed to delete tenant.');
      }
    }
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', phone: '', password: '' });
    setEditingTenant(null);
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    resetForm();
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      fullName: tenant.fullName,
      email: tenant.email,
      phone: tenant.phone,
      password: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant && !canCreateTenants) return;
    if (editingTenant && !canEditTenants) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      if (editingTenant) {
        // Build update payload - only include password if it's provided
        const updatePayload: any = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        };
        
        // Only include password if it's not empty
        if (formData.password && formData.password.trim().length > 0) {
          updatePayload.password = formData.password;
        }
        
        const response = await fetchApi<any>(`/tenants/${editingTenant.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
        });

        const updatedTenant: Tenant = {
          id: response.id,
          fullName: response.fullName,
          email: response.email || '',
          phone: response.phone,
          createdAt: response.createdAt || editingTenant.createdAt,
        };

        setTenants((prev) =>
          prev.map((tenant) => (tenant.id === editingTenant.id ? updatedTenant : tenant))
        );
      } else {
        const response = await fetchApi<any>('/tenants', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        
        // Map response to Tenant interface (exclude password and other fields)
        const newTenant: Tenant = {
          id: response.id,
          fullName: response.fullName,
          email: response.email || '',
          phone: response.phone,
          createdAt: response.createdAt || new Date().toISOString(),
        };
        
        setTenants([newTenant, ...tenants]);
      }
      
      setIsModalOpen(false);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Failed to save tenant:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('An unexpected error occurred while saving tenant.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
          <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${
            darkMode ? 'bg-black' : 'bg-gray-100'
          }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.tenants || 'Tenants' },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t.tenantsList || 'Tenants'}
          </h1>
                 <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                   {t.manageTenantAccounts || 'Manage tenant accounts and information'}
                 </p>
        </div>
        {canCreateTenants && (
          <button 
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.createTenant}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Search Bar */}
      {tenants.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
        </div>
      )}

      {/* Table */}
            <div className={`bg-white dark:bg-black shadow-md rounded-lg overflow-hidden border ${
              darkMode ? 'border-blue-600/30' : 'border-gray-200'
            }`}>
        {filteredTenants.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2.586a1 1 0 00-.707.293L12 7.707l-2.707-2.707A1 1 0 008.586 5H7a2 2 0 00-2 2v11a2 2 0 002 2h2m4 0h2a2 2 0 002-2v-7a2 2 0 00-2-2h-2m-4 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-4 0a5 5 0 0110 0v2a5 5 0 01-10 0V7a2 2 0 00-2-2H3a2 2 0 00-2 2v11a2 2 0 002 2h2" />
              </svg>
            }
            title={tenants.length === 0 ? (t.noTenants || 'No tenants yet') : 'No results found'}
            description={
              tenants.length === 0
                ? 'Get started by creating your first tenant account.'
                : 'Try adjusting your search query.'
            }
            actionLabel={tenants.length === 0 && canCreateTenants ? (t.createTenant || 'Create Tenant') : undefined}
            onAction={tenants.length === 0 && canCreateTenants ? openCreateModal : undefined}
          />
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`rounded-lg border p-4 ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className={`text-base font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.fullName}
                      </h3>
                      {tenant.email && (
                        <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {tenant.email}
                        </p>
                      )}
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {tenant.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {canEditTenants && (
                        <button
                          onClick={() => openEditModal(tenant)}
                          className={`transition-colors text-sm font-medium ${
                            darkMode
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          {t.edit}
                        </button>
                      )}
                      {canDeleteTenants && (
                        <button
                          onClick={() => handleDeleteTenant(tenant.id)}
                          className={`transition-colors text-sm font-medium ${
                            darkMode
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          {t.delete || 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Created: {new Date(tenant.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className={`min-w-full divide-y ${
                darkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                <thead className={`sticky top-0 ${darkMode ? 'bg-black border-b border-blue-600/30' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.fullName}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.email}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.phone}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.createdAt}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                  darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
                }`}>
                  {filteredTenants.map((tenant, index) => (
                    <tr
                      key={tenant.id}
                      className={`transition-colors ${
                        index % 2 === 0 
                          ? (darkMode ? 'bg-black' : 'bg-white') 
                          : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                      } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {tenant.fullName}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {tenant.email || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {tenant.phone}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          {canEditTenants && (
                            <button 
                              onClick={() => openEditModal(tenant)}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-blue-600 hover:text-blue-900'
                              }`}
                            >
                              {t.edit}
                            </button>
                          )}
                          {canDeleteTenants && (
                            <button
                              onClick={() => handleDeleteTenant(tenant.id)}
                              className={`transition-colors ${
                                darkMode
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-red-600 hover:text-red-900'
                              }`}
                            >
                              {t.delete || 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Tenant Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-auto border dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingTenant ? t.edit : t.createTenant}
            </h2>
            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.fullName} *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.phone} *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              {/* Email - Full Width */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tenant@example.com"
                  className={`w-full rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional - used for login and notifications</p>
              </div>

              {/* Password */}
              {!editingTenant ? (
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.password} *
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters</p>
                </div>
              ) : (
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.password}
                  </label>
                  <input
                    type="password"
                    id="password"
                    minLength={6}
                    placeholder="Enter new password to change"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty to keep current password</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {submitting ? t.loading : editingTenant ? t.save : t.createTenant}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
