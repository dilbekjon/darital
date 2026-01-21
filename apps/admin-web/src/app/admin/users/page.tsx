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

enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  SUPPORT = 'SUPPORT',
  ANALYST = 'ANALYST',
  TENANT_USER = 'TENANT_USER',
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user, loading, hasPermission, refetchUser } = useAuth();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<AdminRole | ''>( '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: AdminRole.ADMIN as AdminRole,
  });

  // Filter users based on search query and role
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, searchQuery, roleFilter]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('admin.users.read')) {
        setPageLoading(false);
        return;
      }
      loadUsers();
    }
  }, [loading, user, hasPermission]);

  const loadUsers = async () => {
    setPageLoading(true);
    setError(null);
    try {
      const data = await fetchApi<User[]>('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setPageLoading(false);
    }
  };

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingUser || !newRole || !hasPermission('admin.users.update')) return;
    setError(null);
    try {
      await fetchApi(`/admin/users/${editingUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      alert(t.roleUpdatedSuccessfully);
      setIsModalOpen(false);
      setEditingUser(null);
      setNewRole('');
      await loadUsers(); // Reload users to reflect changes
      await refetchUser(); // Re-fetch current user to update permissions if their own role changed
    } catch (err) {
      console.error('Failed to update role:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('An unexpected error occurred while updating role.');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t.confirmDeleteUser)) return;
    if (!hasPermission('admin.users.update')) return;
    setError(null);
    try {
      await fetchApi(`/admin/users/${userId}`, {
        method: 'DELETE',
      });
      alert(t.userDeletedSuccessfully);
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('An unexpected error occurred while deleting user.');
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('admin.users.update')) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetchApi<User>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      await loadUsers();
      setIsCreateModalOpen(false);
      setFormData({ email: '', password: '', fullName: '', role: AdminRole.ADMIN });
      setError(null);
    } catch (err) {
      console.error('Failed to create user:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('An unexpected error occurred while creating user.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !hasPermission('admin.users.read')) {
    return <NoAccess />;
  }

  const canManageUsers = hasPermission('admin.users.update');

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${
      darkMode ? 'bg-black' : 'bg-gray-100'
    }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.adminUsers || 'Admin Users' },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t.adminUsers || 'Admin Users'}
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t.manageAdminAccounts || 'Manage admin user accounts and permissions'}
          </p>
        </div>
        {canManageUsers && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.createUser || 'Create User'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Search and Filter Bar */}
      {users.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t.searchUsers}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="ALL">{t.allRoles || 'All Roles'}</option>
              <option value="SUPER_ADMIN">{t.superAdmin}</option>
              <option value="ADMIN">{t.admin}</option>
              <option value="CASHIER">{t.cashier}</option>
              <option value="SUPPORT">{t.support}</option>
              <option value="ANALYST">{t.analyst}</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
            <div className={`bg-white dark:bg-black shadow-md rounded-lg overflow-hidden border ${
        darkMode ? 'border-blue-600/30' : 'border-gray-200'
      }`}>
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2.586a1 1 0 00-.707.293L12 7.707l-2.707-2.707A1 1 0 008.586 5H7a2 2 0 00-2 2v11a2 2 0 002 2h2m4 0h2a2 2 0 002-2v-7a2 2 0 00-2-2h-2m-4 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-4 0a5 5 0 0110 0v2a5 5 0 01-10 0V7a2 2 0 00-2-2H3a2 2 0 00-2 2v11a2 2 0 002 2h2" />
              </svg>
            }
            title={users.length === 0 ? t.noUsersFound : t.noResultsFound}
            description={
              users.length === 0
                ? t.getStartedByCreatingUser
                : t.tryAdjustingFilters
            }
            actionLabel={users.length === 0 && canManageUsers ? (t.createUser || 'Create User') : undefined}
            onAction={users.length === 0 && canManageUsers ? () => setIsCreateModalOpen(true) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${
              darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
            }`}>
              <thead className={`sticky top-0 ${darkMode ? 'bg-black border-b border-blue-600/30' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.fullName || 'Full Name'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.email || 'Email'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.role || 'Role'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.createdAt || 'Created At'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}>
                {filteredUsers.map((u, index) => (
                <tr
                  key={u.id}
                  className={`transition-colors ${
                    index % 2 === 0 
                      ? (darkMode ? 'bg-black' : 'bg-white') 
                      : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                  } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'}`}
                >
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>{u.fullName}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>{u.email}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>{u.role === 'SUPER_ADMIN' ? t.superAdmin :
                         u.role === 'ADMIN' ? t.admin :
                         u.role === 'CASHIER' ? t.cashier :
                         u.role === 'SUPPORT' ? t.support :
                         u.role === 'ANALYST' ? t.analyst : u.role}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageUsers && u.id !== user?.id && (
                      <>
                        <button 
                          onClick={() => handleEditRole(u)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          {t.editRole}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {t.delete}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className={`bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-md mx-auto border ${
            darkMode ? 'border-blue-600/30' : 'border-gray-200'
          }`}>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t.createUser}</h2>
            {error && (
              <div className={`px-4 py-3 rounded-lg mb-4 border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.email} *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
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
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.passwordMinLength}</p>
              </div>
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.role} *
                </label>
                <select
                  id="role"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {Object.values(AdminRole)
                    .filter(role => role !== AdminRole.TENANT_USER)
                    .map((role) => (
                      <option key={role} value={role}>
                        {role === AdminRole.SUPER_ADMIN ? t.superAdmin :
                         role === AdminRole.ADMIN ? t.admin :
                         role === AdminRole.CASHIER ? t.cashier :
                         role === AdminRole.SUPPORT ? t.support :
                         role === AdminRole.ANALYST ? t.analyst : role}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setFormData({ email: '', password: '', fullName: '', role: AdminRole.ADMIN });
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.creating : t.createUser}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {isModalOpen && editingUser && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className={`bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-md mx-auto border ${
            darkMode ? 'border-blue-600/30' : 'border-gray-200'
          }`}>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t.editUserRole}: {editingUser.fullName}</h2>
            {error && (
              <div className={`px-4 py-3 rounded-lg mb-4 border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.role}</label>
              <select
                id="userRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {Object.values(AdminRole)
                  .filter(role => role !== AdminRole.TENANT_USER) // Cannot assign TENANT_USER role here
                  .map((role) => (
                    <option key={role} value={role}>
                      {role === AdminRole.SUPER_ADMIN ? t.superAdmin :
                       role === AdminRole.ADMIN ? t.admin :
                       role === AdminRole.CASHIER ? t.cashier :
                       role === AdminRole.SUPPORT ? t.support :
                       role === AdminRole.ANALYST ? t.analyst : role}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveRole}
                disabled={!newRole || newRole === editingUser.role}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
