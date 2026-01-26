'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import DaritalLoader from '../../../components/DaritalLoader';

interface Contract {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pdfUrl: string;
  tenant: { fullName: string; email: string };
  unit: { name: string };
}

interface Tenant {
  id: string;
  fullName: string;
  email: string;
}

interface Unit {
  id: string;
  name: string;
  price: number | string | { toNumber?: () => number };
  status: string;
  area?: number;
  floor?: number;
}

export default function AdminContractsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState({
    tenantId: '',
    unitId: '',
    startDate: '',
    endDate: '',
    amount: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState({
    startDate: '',
    endDate: '',
    amount: '',
    notes: '',
  });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [newStatus, setNewStatus] = useState<'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [archivingContractId, setArchivingContractId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Filter contracts based on search query and status
  const filteredContracts = useMemo(() => {
    let filtered = contracts;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contract) =>
          contract.tenant.fullName.toLowerCase().includes(query) ||
          contract.tenant.email.toLowerCase().includes(query) ||
          contract.unit.name.toLowerCase().includes(query) ||
          contract.status.toLowerCase().includes(query) ||
          contract.amount.toString().includes(query)
      );
    }

    return filtered;
  }, [contracts, searchQuery, statusFilter]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('contracts.read')) {
        setPageLoading(false);
        return;
      }

      const loadData = async () => {
        try {
          const [contractsData, tenantsData, unitsData] = await Promise.all([
            fetchApi<Contract[]>('/contracts?includeArchived=false'),
            fetchApi<Tenant[]>('/tenants'),
            fetchApi<Unit[]>('/units'),
          ]);
          setContracts(contractsData);
          setTenants(tenantsData);
          setUnits(unitsData);
        } catch (err) {
          console.error('Failed to load data:', err);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred.');
          }
        } finally {
          setPageLoading(false);
        }
      };
      loadData();
    }
  }, [loading, user, hasPermission]);

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('contracts.read')) {
    return <NoAccess />;
  }

  const canCreateContracts = hasPermission('contracts.create');
  const canUpdateContracts = hasPermission('contracts.update');
  const canDeleteContracts = hasPermission('contracts.delete');

  const handleArchiveContract = async (contractId: string) => {
    if (!canUpdateContracts) return;
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    
    const reason = prompt(
      `Shartnomani arxivlash: ${contract.tenant.fullName} - ${contract.unit.name}\n\n` +
      `Bu faqat shartnomani arxivlaydi, ijara oluvchi arxivlanmaydi.\n\n` +
      `Arxivlash sababi (ixtiyoriy):`
    );
    
    if (reason === null) return; // User cancelled
    
    setArchivingContractId(contractId);
    setError(null);
    
    try {
      await fetchApi(`/contracts/${contractId}/archive`, {
        method: 'PUT',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      
      // Reload contracts list (excluding archived ones)
      const contractsData = await fetchApi<Contract[]>('/contracts?includeArchived=false');
      setContracts(contractsData);
      setError(null);
    } catch (err) {
      console.error('Failed to archive contract:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('Shartnomani arxivlashda xato yuz berdi');
      }
    } finally {
      setArchivingContractId(null);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!canDeleteContracts) return;
    if (!confirm(`${t.confirmDeleteContract} ${t.actionCannotBeUndone}`)) {
      return;
    }

    try {
      await fetchApi(`/contracts/${contractId}`, {
        method: 'DELETE',
      });
      
      setContracts((prev) => prev.filter((contract) => contract.id !== contractId));
    } catch (err) {
      console.error('Failed to delete contract:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError(t.failedToDeleteContract);
      }
    }
  };

  const openEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setEditFormData({
      startDate: contract.startDate.split('T')[0],
      endDate: contract.endDate.split('T')[0],
      amount: contract.amount.toString(),
      notes: (contract as any).notes || '',
    });
    setEditFile(null);
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateContracts || !editingContract) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError(t.authenticationRequired);
        setSubmitting(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('startDate', new Date(editFormData.startDate).toISOString());
      formDataToSend.append('endDate', new Date(editFormData.endDate).toISOString());
      formDataToSend.append('amount', editFormData.amount);
      
      if (editFormData.notes.trim()) {
        formDataToSend.append('notes', editFormData.notes.trim());
      }

      // Only append file if a new one is selected
      if (editFile) {
        formDataToSend.append('file', editFile);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/contracts/${editingContract.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(response.status, errorData.message || 'Failed to update contract', errorData);
      }

      const updatedContract = await response.json();

      setContracts((prev) =>
        prev.map((c) => (c.id === editingContract.id ? updatedContract : c))
      );

      setIsEditModalOpen(false);
      setEditingContract(null);
      setEditFormData({ startDate: '', endDate: '', amount: '', notes: '' });
      setEditFile(null);
    } catch (err) {
      console.error('Failed to update contract:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError(t.failedToUpdateContract);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (contract: Contract) => {
    setEditingContract(contract);
    // Set default new status based on current status
    if (contract.status === 'DRAFT') {
      setNewStatus('ACTIVE');
    } else if (contract.status === 'ACTIVE') {
      setNewStatus('COMPLETED');
    } else {
      setNewStatus(contract.status);
    }
    setError(null);
    setIsStatusModalOpen(true);
  };

  const handleChangeStatus = async () => {
    if (!canUpdateContracts || !editingContract) return;

    setUpdatingStatus(true);
    setError(null);

    try {
      const updatedContract = await fetchApi<Contract>(`/contracts/${editingContract.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      setContracts((prev) =>
        prev.map((c) => (c.id === editingContract.id ? updatedContract : c))
      );

      setIsStatusModalOpen(false);
      setEditingContract(null);
    } catch (err) {
      console.error('Failed to change contract status:', err);
      if (err instanceof ApiError) {
        const errorData = err.data;
        if (errorData?.code === 'INVALID_STATUS_TRANSITION') {
          setError(
            `Cannot change status from ${errorData.details?.currentStatus} to ${errorData.details?.requestedStatus}. ` +
            `Allowed transitions: ${errorData.details?.allowedTransitions?.join(', ') || 'none'}`
          );
        } else {
          setError(errorData?.message || err.message);
        }
      } else {
        setError(t.failedToChangeStatus);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getAvailableStatuses = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'DRAFT':
        return ['ACTIVE', 'CANCELLED'];
      case 'ACTIVE':
        return ['COMPLETED', 'CANCELLED'];
      case 'COMPLETED':
      case 'CANCELLED':
        return [];
      default:
        return [];
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateContracts || !file) {
      setError(t.pleaseSelectPdfFile);
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('tenantId', formData.tenantId);
      formDataToSend.append('unitId', formData.unitId);
      formDataToSend.append('startDate', new Date(formData.startDate).toISOString());
      formDataToSend.append('endDate', new Date(formData.endDate).toISOString());
      formDataToSend.append('amount', formData.amount);
      if (formData.notes.trim()) {
        formDataToSend.append('notes', formData.notes.trim());
      }
      formDataToSend.append('file', file);

      const token = getToken();
      if (!token) {
        setError(t.authenticationRequired);
        setSubmitting(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(response.status, errorData.message || 'Failed to create contract', errorData);
      }

      const newContract = await response.json();
      
      // Reload contracts list
      const contractsData = await fetchApi<Contract[]>('/contracts?includeArchived=false');
      setContracts(contractsData);
      
      setIsModalOpen(false);
      setFormData({ tenantId: '', unitId: '', startDate: '', endDate: '', amount: '', notes: '' });
      setFile(null);
      setError(null);
    } catch (err) {
      console.error('Failed to create contract:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError(t.failedToCreateContract);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700';
      case 'ACTIVE':
        return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
      case 'COMPLETED':
        return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 'CANCELLED':
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdownId]);

  return (
          <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${
            darkMode ? 'bg-black' : 'bg-gray-100'
          }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.contracts || 'Contracts' },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t.contractsList || 'Contracts'}
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t.manageRentalContracts || 'Manage rental contracts and agreements'}
          </p>
        </div>
        {canCreateContracts && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.createContract || 'Create Contract'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Search and Filter Bar */}
      {contracts.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="ALL">{t.allStatus || 'All Status'}</option>
              <option value="DRAFT">{t.statusDraft}</option>
              <option value="ACTIVE">{t.statusActive}</option>
              <option value="COMPLETED">{t.statusCompleted}</option>
              <option value="CANCELLED">{t.statusCancelled}</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
            <div className={`bg-white dark:bg-black shadow-md rounded-lg overflow-hidden border ${
              darkMode ? 'border-blue-600/30' : 'border-gray-200'
            }`}>
        {filteredContracts.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title={contracts.length === 0 ? (t.noContracts || 'No contracts yet') : t.noResultsFound}
            description={
              contracts.length === 0
                ? t.getStartedByCreating
                : t.tryAdjustingFilters
            }
            actionLabel={contracts.length === 0 && canCreateContracts ? (t.createContract || 'Create Contract') : undefined}
            onAction={contracts.length === 0 && canCreateContracts ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredContracts.map((contract) => (
                <div
                  key={contract.id}
                  className={`rounded-lg border p-4 ${
                    darkMode
                      ? 'bg-black border-blue-600/30'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className={`text-base font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {contract.tenant.fullName}
                      </h3>
                      <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t.unit}: {contract.unit.name}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                      {contract.status === 'DRAFT' ? t.statusDraft :
                       contract.status === 'ACTIVE' ? t.statusActive :
                       contract.status === 'COMPLETED' ? t.statusCompleted :
                       contract.status === 'CANCELLED' ? t.statusCancelled : contract.status}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between pt-3 border-t ${
                    darkMode ? 'border-blue-600/30' : 'border-gray-200'
                  }`}>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      UZS {contract.amount.toLocaleString()}<span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>/mo</span>
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={contract.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm font-medium transition-colors ${
                          darkMode
                            ? 'text-blue-400 hover:text-blue-300'
                            : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        {t.viewPDF}
                      </a>
                      {canUpdateContracts && (
                        <>
                          <button
                            onClick={() => openEditModal(contract)}
                            className={`text-sm font-medium transition-colors ${
                              darkMode
                                ? 'text-green-400 hover:text-green-300'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {t.edit}
                          </button>
                          {getAvailableStatuses(contract.status).length > 0 && (
                            <button
                              onClick={() => openStatusModal(contract)}
                              className={`text-sm font-medium transition-colors ${
                                darkMode
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-yellow-600 hover:text-yellow-800'
                              }`}
                            >
                              {t.changeStatus}
                            </button>
                          )}
                        </>
                      )}
                      {canDeleteContracts && (
                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className={`text-sm font-medium transition-colors ${
                            darkMode
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          {t.delete}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className={`min-w-full divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}>
                <thead className={`sticky top-0 ${darkMode ? 'bg-black border-b border-blue-600/30' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.tenantName}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.unitName}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.startDate}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.endDate}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.monthlyRent || 'Monthly Rent'}
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.status}
                    </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                  darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
                }`}>
                  {filteredContracts.map((contract, index) => (
                    <tr
                      key={contract.id}
                      className={`transition-colors ${
                        index % 2 === 0 
                          ? (darkMode ? 'bg-black' : 'bg-white') 
                          : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                      } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {contract.tenant.fullName}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {contract.unit.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {formatDate(contract.startDate)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {formatDate(contract.endDate)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        UZS {contract.amount.toLocaleString()}<span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                          {contract.status === 'DRAFT' ? t.statusDraft :
                           contract.status === 'ACTIVE' ? t.statusActive :
                           contract.status === 'COMPLETED' ? t.statusCompleted :
                           contract.status === 'CANCELLED' ? t.statusCancelled : contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative actions-dropdown">
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === contract.id ? null : contract.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                            }`}
                            aria-label="Actions menu"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {openDropdownId === contract.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border py-1 z-50 ${
                                darkMode 
                                  ? 'bg-black border-blue-600/40' 
                                  : 'bg-white border-gray-200'
                              }`}>
                                <a
                                  href={contract.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setOpenDropdownId(null)}
                                  className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                    darkMode
                                      ? 'text-blue-400 hover:bg-blue-600/20 hover:text-blue-300'
                                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                                  }`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {t.viewPDF || 'PDF ni ko\'rish'}
                                </a>
                                
                                {canUpdateContracts && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        openEditModal(contract);
                                      }}
                                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left ${
                                        darkMode
                                          ? 'text-green-400 hover:bg-green-600/20 hover:text-green-300'
                                          : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      {t.edit || 'Tahrirlash'}
                                    </button>
                                    
                                    {getAvailableStatuses(contract.status).length > 0 && (
                                      <button
                                        onClick={() => {
                                          setOpenDropdownId(null);
                                          openStatusModal(contract);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left ${
                                          darkMode
                                            ? 'text-yellow-400 hover:bg-yellow-600/20 hover:text-yellow-300'
                                            : 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                                        }`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        {t.changeStatus || 'Holatni o\'zgartirish'}
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleArchiveContract(contract.id);
                                      }}
                                      disabled={archivingContractId === contract.id}
                                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left ${
                                        archivingContractId === contract.id
                                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                                          : darkMode
                                          ? 'text-orange-400 hover:bg-orange-600/20 hover:text-orange-300'
                                          : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                      </svg>
                                      {archivingContractId === contract.id ? (t.loading || 'Yuklanmoqda...') : (t.archive || 'Arxivlash')}
                                    </button>
                                  </>
                                )}
                                
                                {canDeleteContracts && (
                                  <>
                                    <div className={`border-t my-1 ${
                                      darkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`} />
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleDeleteContract(contract.id);
                                      }}
                                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left ${
                                        darkMode
                                          ? 'text-red-400 hover:bg-red-600/20 hover:text-red-300'
                                          : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      {t.delete || 'O\'chirish'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
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

      {/* Edit Contract Modal */}
      {isEditModalOpen && editingContract && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto border ${
            darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>{t.editContract}</h2>
            {error && (
              <div className={`px-4 py-3 rounded-lg mb-4 border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleUpdateContract} className="space-y-6">
              {/* Contract Info (Read-only) */}
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t.tenant}:</strong> {editingContract.tenant.fullName}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t.unit}:</strong> {editingContract.unit.name}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>{t.currentStatus}:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(editingContract.status)}`}>
                    {editingContract.status === 'DRAFT' ? t.statusDraft :
                     editingContract.status === 'ACTIVE' ? t.statusActive :
                     editingContract.status === 'COMPLETED' ? t.statusCompleted :
                     editingContract.status === 'CANCELLED' ? t.statusCancelled : editingContract.status}
                  </span>
                </p>
              </div>

              {/* Contract Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editStartDate" className={`block text-sm font-semibold mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.startDate} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="editStartDate"
                    required
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                      darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
                <div>
                  <label htmlFor="editEndDate" className={`block text-sm font-semibold mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.endDate} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="editEndDate"
                    required
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    min={editFormData.startDate}
                    className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                      darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
              </div>

              {/* Monthly Rent */}
              <div>
                <label htmlFor="editAmount" className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {t.monthlyRent || 'Monthly Rent'} (UZS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="editAmount"
                  required
                  min="0"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  placeholder={t.monthlyRent || 'Enter monthly rent amount'}
                  className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                    darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {editFormData.amount && editFormData.startDate && editFormData.endDate && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t.totalContractAmount || 'Total contract amount'}: UZS {(
                      parseFloat(editFormData.amount) * 
                      Math.max(1, Math.ceil(
                        (new Date(editFormData.endDate).getTime() - new Date(editFormData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                      ))
                    ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              {/* Contract Notes */}
              <div>
                <label htmlFor="editNotes" className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {t.contractNotes}
                </label>
                <textarea
                  id="editNotes"
                  rows={4}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder={t.contractNotesPlaceholder}
                  className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                    darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>

              {/* PDF File Upload (Optional) */}
              <div>
                <label htmlFor="editFile" className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {t.contractPdfFile}
                </label>
                <div className={`p-3 rounded-lg border mb-2 ${
                  darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <strong>{t.currentPdf}:</strong>{' '}
                    <a
                      href={editingContract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline ${
                        darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                      }`}
                    >
                      {t.viewCurrentPdf}
                    </a>
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t.leaveEmptyToKeepPdf}
                  </p>
                </div>
                <input
                  type="file"
                  id="editFile"
                  accept="application/pdf"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                    darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {editFile && (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <strong>{t.newFileSelected}:</strong> {editFile.name} ({(editFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingContract(null);
                    setEditFormData({ startDate: '', endDate: '', amount: '', notes: '' });
                    setEditFile(null);
                    setError(null);
                  }}
                  className={`px-6 py-2 rounded-md transition-colors ${
                    darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? t.loading : t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && editingContract && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-md mx-auto border ${
            darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Change Contract Status</h2>
            {error && (
              <div className={`px-4 py-3 rounded-lg mb-4 border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Contract:</strong> {editingContract.tenant.fullName} - {editingContract.unit.name}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Current Status:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(editingContract.status)}`}>
                    {editingContract.status}
                  </span>
                </p>
              </div>
              <div>
                <label htmlFor="newStatus" className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  New Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="newStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className={`w-full rounded-md shadow-sm px-3 py-2 border ${
                    darkMode ? 'bg-gray-900 border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  {getAvailableStatuses(editingContract.status).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {getAvailableStatuses(editingContract.status).length === 0 && (
                  <p className={`mt-2 text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    This contract cannot be changed from {editingContract.status} status.
                  </p>
                )}
              </div>
              {newStatus === 'ACTIVE' && editingContract.status === 'DRAFT' && (
                <div className={`p-3 rounded-lg border ${
                  darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <p className="text-sm">
                    ⚠️ Activating this contract will mark the unit as BUSY.
                  </p>
                </div>
              )}
              {(newStatus === 'COMPLETED' || newStatus === 'CANCELLED') && editingContract.status === 'ACTIVE' && (
                <div className={`p-3 rounded-lg border ${
                  darkMode ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <p className="text-sm">
                    ✅ Changing status to {newStatus} will mark the unit as FREE.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsStatusModalOpen(false);
                    setEditingContract(null);
                    setError(null);
                  }}
                  className={`px-6 py-2 rounded-md transition-colors ${
                    darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleChangeStatus}
                  disabled={updatingStatus || getAvailableStatuses(editingContract.status).length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {updatingStatus ? (t.loading || 'Updating...') : 'Change Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className={`bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto border ${
            darkMode ? 'border-blue-600/30' : 'border-gray-200'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>{t.createContract || 'Create Contract'}</h2>
            {error && (
              <div className={`px-4 py-3 rounded-lg mb-4 border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateContract} className="space-y-6">
              {/* Tenant Selection */}
              <div>
                <label htmlFor="tenantId" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t.tenantName} <span className="text-red-500">*</span>
                </label>
                <select
                  id="tenantId"
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">{t.selectTenant || 'Select Tenant'}</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.fullName} {tenant.email ? `(${tenant.email})` : ''}
                    </option>
                  ))}
                </select>
                {formData.tenantId && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border dark:border-blue-800/50">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong className={darkMode ? 'text-blue-300' : 'text-blue-700'}>Selected Tenant:</strong> {tenants.find(t => t.id === formData.tenantId)?.fullName}
                      {tenants.find(t => t.id === formData.tenantId)?.email && (
                        <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>({tenants.find(t => t.id === formData.tenantId)?.email})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Unit Selection */}
              <div>
                <label htmlFor="unitId" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t.unitName} <span className="text-red-500">*</span>
                </label>
                <select
                  id="unitId"
                  required
                  value={formData.unitId}
                  onChange={(e) => {
                    const selectedUnit = units.find(u => u.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      unitId: e.target.value,
                      // Auto-fill amount with unit price if not set
                      amount: formData.amount || (selectedUnit ? String(
                        typeof selectedUnit.price === 'number' 
                          ? selectedUnit.price 
                          : typeof selectedUnit.price === 'object' && selectedUnit.price?.toNumber 
                            ? selectedUnit.price.toNumber() 
                            : parseFloat(String(selectedUnit.price)) || 0
                      ) : '')
                    });
                  }}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">{t.selectUnit || 'Select Unit'}</option>
                  {units.map((unit) => {
                    const priceValue = typeof unit.price === 'number' 
                      ? unit.price 
                      : typeof unit.price === 'object' && unit.price?.toNumber 
                        ? unit.price.toNumber() 
                        : parseFloat(String(unit.price)) || 0;
                    return (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} - UZS {priceValue.toLocaleString()} 
                        {unit.area && ` - ${unit.area}m²`}
                        {unit.floor && ` - Floor ${unit.floor}`}
                        {` (${unit.status})`}
                      </option>
                    );
                  })}
                </select>
                {formData.unitId && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border dark:border-green-800/50">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong className={darkMode ? 'text-green-300' : 'text-green-700'}>Selected Unit:</strong> {units.find(u => u.id === formData.unitId)?.name}
                      {(() => {
                        const selectedUnit = units.find(u => u.id === formData.unitId);
                        const priceValue = selectedUnit ? (
                          typeof selectedUnit.price === 'number' 
                            ? selectedUnit.price 
                            : typeof selectedUnit.price === 'object' && selectedUnit.price?.toNumber 
                              ? selectedUnit.price.toNumber() 
                              : parseFloat(String(selectedUnit.price)) || 0
                        ) : 0;
                        return (
                          <>
                            {selectedUnit?.area && <span className="ml-2">• Area: {selectedUnit.area}m²</span>}
                            {selectedUnit?.floor && <span className="ml-2">• Floor: {selectedUnit.floor}</span>}
                            <span className="ml-2">• Price: UZS {priceValue.toLocaleString()}</span>
                            <span className="ml-2">• Status: {selectedUnit?.status}</span>
                          </>
                        );
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Contract Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.startDate} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t.endDate} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  />
                </div>
              </div>
              {formData.startDate && formData.endDate && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border dark:border-gray-600">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Contract Duration:</strong> {
                      Math.ceil(
                        (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)
                      )
                    } days
                  </p>
                </div>
              )}

              {/* Monthly Rent */}
              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t.monthlyRent || 'Monthly Rent'} (UZS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder={t.monthlyRent || 'Enter monthly rent amount'}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                {formData.amount && formData.startDate && formData.endDate && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t.totalContractAmount || 'Total contract amount'}: UZS {(
                      parseFloat(formData.amount) * 
                      Math.max(1, Math.ceil(
                        (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                      ))
                    ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              {/* Contract Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Contract Notes / Description
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes, terms, or description about this contract..."
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: Add any special terms, conditions, or notes about this contract
                </p>
              </div>

              {/* PDF File Upload */}
              <div>
                <label htmlFor="file" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Contract PDF File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  id="file"
                  required
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                {file && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Selected File:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ tenantId: '', unitId: '', startDate: '', endDate: '', amount: '', notes: '' });
                    setFile(null);
                    setError(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !file || !formData.tenantId || !formData.unitId}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? t.loading : (t.save || 'Create Contract')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
