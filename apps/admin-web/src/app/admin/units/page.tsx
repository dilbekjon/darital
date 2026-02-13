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

interface Building {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  price: number;
  area?: number;
  floor?: number;
  status: 'FREE' | 'BUSY' | 'MAINTENANCE';
  buildingId?: string | null;
  building?: Building | null;
  createdAt: string;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
}

interface Contract {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  tenant: {
    fullName: string;
    email: string;
  };
}

export default function AdminUnitsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archivingUnitId, setArchivingUnitId] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    area: '',
    floor: '',
    status: 'FREE' as 'FREE' | 'BUSY' | 'MAINTENANCE',
    buildingId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter units based on search query and status
  const filteredUnits = useMemo(() => {
    let filtered = units;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (unit) =>
          unit.name.toLowerCase().includes(query) ||
          unit.price.toString().includes(query) ||
          (unit.area && unit.area.toString().includes(query)) ||
          (unit.floor && unit.floor.toString().includes(query)) ||
          unit.status.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [units, searchQuery, statusFilter]);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('contracts.read')) {
        setPageLoading(false);
        return;
      }

      const loadData = async () => {
        try {
          const [unitsData, contractsData, buildingsData] = await Promise.all([
            fetchApi<Unit[]>(`/units${includeArchived ? '?includeArchived=true' : ''}`),
            fetchApi<Contract[]>('/contracts'),
            fetchApi<Building[]>('/buildings'),
          ]);
          setUnits(unitsData);
          setContracts(contractsData);
          setBuildings(buildingsData);
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
  }, [loading, user, hasPermission, includeArchived]);

  if (loading || pageLoading) {
    return (
      <div className={`flex flex-1 items-center justify-center min-h-screen ${
        darkMode ? 'bg-black' : 'bg-gray-100'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
          darkMode ? 'border-blue-500' : 'border-blue-500'
        }`}></div>
      </div>
    );
  }

  if (!user || !hasPermission('contracts.read')) {
    return <NoAccess />;
  }

  const canManageUnits = hasPermission('contracts.update');

  const getUnitContracts = (unitId: string) => {
    return contracts.filter(c => c.unitId === unitId);
  };

  const getActiveTenant = (unitId: string) => {
    const unitContracts = getUnitContracts(unitId);
    const activeContract = unitContracts.find(c => c.status === 'ACTIVE');
    return activeContract ? activeContract.tenant : null;
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', area: '', floor: '', status: 'FREE', buildingId: '' });
    setEditingUnit(null);
  };

  const openCreateModal = () => {
    setEditingUnit(null);
    resetForm();
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      price: String(unit.price),
      area: unit.area ? String(unit.area) : '',
      floor: unit.floor ? String(unit.floor) : '',
      status: unit.status,
      buildingId: unit.buildingId || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUnits) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const payload: any = {
        name: formData.name,
        price: parseFloat(formData.price),
      };
      
      if (formData.area) payload.area = parseFloat(formData.area);
      if (formData.floor) payload.floor = parseInt(formData.floor);
      if (editingUnit) payload.status = formData.status;
      if (formData.buildingId) {
        payload.buildingId = formData.buildingId;
      } else {
        payload.buildingId = null; // Allow unlinking by selecting empty
      }

      if (editingUnit) {
        const response = await fetchApi<any>(`/units/${editingUnit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        
        setUnits((prev) =>
          prev.map((unit) => (unit.id === editingUnit.id ? { ...unit, ...response } : unit))
        );
      } else {
        const response = await fetchApi<any>('/units', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        
        const newUnit: Unit = {
          id: response.id,
          name: response.name,
          price: typeof response.price === 'number' ? response.price : parseFloat(response.price) || 0,
          area: response.area,
          floor: response.floor,
          status: response.status,
          createdAt: response.createdAt || new Date().toISOString(),
        };
        
        setUnits([newUnit, ...units]);
      }
      
      setIsModalOpen(false);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Failed to save unit:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('An unexpected error occurred while saving unit.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (unitId: string) => {
    if (!canManageUnits) return;
    if (!confirm('Archive this unit? It will be hidden from the main list but can be restored.')) return;
    setArchivingUnitId(unitId);
    setError(null);
    try {
      const updated = await fetchApi<Unit>(`/units/${unitId}/archive`, { method: 'PUT', body: JSON.stringify({}) });
      setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...updated } : u)));
      if (!includeArchived) setUnits((prev) => prev.filter((u) => u.id !== unitId));
    } catch (err) {
      console.error('Failed to archive unit:', err);
      if (err instanceof ApiError) setError(err.data?.message || err.message);
      else setError('Failed to archive unit.');
    } finally {
      setArchivingUnitId(null);
    }
  };

  const handleUnarchive = async (unitId: string) => {
    if (!canManageUnits) return;
    setArchivingUnitId(unitId);
    setError(null);
    try {
      const updated = await fetchApi<Unit>(`/units/${unitId}/unarchive`, { method: 'PUT' });
      setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...updated } : u)));
    } catch (err) {
      console.error('Failed to unarchive unit:', err);
      if (err instanceof ApiError) setError(err.data?.message || err.message);
      else setError('Failed to unarchive unit.');
    } finally {
      setArchivingUnitId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FREE':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'BUSY':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'MAINTENANCE':
        return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
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
          { label: t.units || 'Units' },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t.units || 'Units'}
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t.manageRentalUnits || 'Manage rental units and their availability'}
          </p>
        </div>
        {canManageUnits && (
          <button 
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.createUnit || 'Create Unit'}
          </button>
        )}
      </div>

      {error && (
        <div className={`px-4 py-3 rounded-lg mb-4 border ${
          darkMode
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-red-100 border-red-400 text-red-700'
        }`} role="alert">
          {error}
        </div>
      )}

      {/* Search and Filter Bar */}
      {units.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className={`h-5 w-5 ${
                darkMode ? 'text-gray-400' : 'text-gray-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t.searchUnits}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-900 border-blue-600/30 text-white placeholder-gray-400'
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
                  ? 'bg-gray-900 border-blue-600/30 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="ALL">{t.allStatus}</option>
              <option value="FREE">{t.free}</option>
              <option value="BUSY">{t.busy}</option>
              <option value="MAINTENANCE">{t.maintenance}</option>
            </select>
          </div>
          <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${
            darkMode ? 'bg-gray-900 border-blue-600/30' : 'bg-white border-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded"
            />
            <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {(t as any).includeArchived ?? 'Include archived'}
            </span>
          </label>
        </div>
      )}

      {/* Table */}
      <div className={`shadow-md rounded-lg overflow-hidden border ${
        darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
      }`}>
        {filteredUnits.length === 0 ? (
          <EmptyState
            icon={
              <svg className={`w-16 h-16 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title={units.length === 0 ? t.noUnits : t.noResultsFound}
            description={
              units.length === 0
                ? t.getStartedByCreatingUnit
                : t.tryAdjustingFilters
            }
            actionLabel={units.length === 0 && canManageUnits ? (t.createUnit || 'Create Unit') : undefined}
            onAction={units.length === 0 && canManageUnits ? openCreateModal : undefined}
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
                    {t.unitName || 'Unit Name'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.price || 'Price'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.area || 'Area'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.floor || 'Floor'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {(t as any).building || 'Building'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.status || 'Status'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.tenantName || 'Current Tenant'}
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {t.contracts || 'Contracts'}
                  </th>
                  {canManageUnits && (
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t.actions || 'Actions'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-black' : 'bg-white'} divide-y ${
                darkMode ? 'divide-blue-600/20' : 'divide-gray-200'
              }`}>
                {filteredUnits.map((unit, index) => {
                  const activeTenant = getActiveTenant(unit.id);
                  const unitContracts = getUnitContracts(unit.id);
                  
                  return (
                    <tr
                      key={unit.id}
                      className={`transition-colors ${
                        index % 2 === 0 
                          ? (darkMode ? 'bg-black' : 'bg-white') 
                          : (darkMode ? 'bg-blue-600/5' : 'bg-gray-50')
                      } ${darkMode ? 'hover:bg-blue-600/10' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        <span className="flex items-center gap-2">
                          {unit.name}
                          {unit.isArchived && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                            }`}>
                              Archived
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        UZS {unit.price.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {unit.area ? `${unit.area}m²` : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {unit.floor !== undefined && unit.floor !== null ? `${t.floor} ${unit.floor}` : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {unit.building ? (
                          <span className={`font-medium ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>{unit.building.name}</span>
                        ) : (
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-400'}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(unit.status)}`}>
                          {unit.status === 'FREE' ? t.free :
                           unit.status === 'BUSY' ? t.busy :
                           unit.status === 'MAINTENANCE' ? t.maintenance : unit.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {activeTenant ? (
                          <div>
                            <div className={`font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>{activeTenant.fullName}</div>
                            <div className={`text-xs ${
                              darkMode ? 'text-gray-400' : 'text-gray-400'
                            }`}>{activeTenant.email}</div>
                          </div>
                        ) : (
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-400'}>-</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        <div className="flex flex-col">
                          <span className="font-medium">{unitContracts.length}</span>
                          <span className={`text-xs ${
                            darkMode ? 'text-gray-400' : 'text-gray-400'
                          }`}>
                            {unitContracts.filter(c => c.status === 'ACTIVE').length} {t.active.toLowerCase()}
                          </span>
                        </div>
                      </td>
                      {canManageUnits && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => openEditModal(unit)}
                            className={`mr-4 transition-colors ${
                              darkMode
                                ? 'text-blue-400 hover:text-blue-300'
                                : 'text-blue-600 hover:text-blue-900'
                            }`}
                          >
                            {t.edit || 'Edit'}
                          </button>
                          {unit.isArchived ? (
                            <button
                              onClick={() => handleUnarchive(unit.id)}
                              disabled={archivingUnitId === unit.id}
                              className={`transition-colors ${
                                archivingUnitId === unit.id ? 'opacity-50 cursor-not-allowed' : ''
                              } ${darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800'}`}
                            >
                              {archivingUnitId === unit.id ? '...' : ((t as any).unarchive ?? 'Unarchive')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(unit.id)}
                              disabled={archivingUnitId === unit.id}
                              className={`transition-colors ${
                                archivingUnitId === unit.id ? 'opacity-50 cursor-not-allowed' : ''
                              } ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-800'}`}
                            >
                              {archivingUnitId === unit.id ? '...' : ((t as any).archive ?? 'Archive')}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Unit Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 ${
          darkMode ? 'bg-black bg-opacity-70' : 'bg-gray-600 bg-opacity-50'
        }`}>
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-md mx-auto border ${
            darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {editingUnit ? t.editUnit : t.createUnit}
            </h2>
            {error && (
              <div className={`px-4 py-3 rounded-lg mb-4 border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-800 text-red-300' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`} role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {t.unitName} *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., Unit 101"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="price" className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {t.price} (UZS) *
                </label>
                <input
                  type="number"
                  id="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="150000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="area" className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.area} (m²)
                  </label>
                  <input
                    type="number"
                    id="area"
                    min="0"
                    step="0.1"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                    placeholder="75.5"
                  />
                </div>
                <div>
                  <label htmlFor="floor" className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.floor || 'Floor'}
                  </label>
                  <input
                    type="number"
                    id="floor"
                    min="0"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="buildingId" className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {(t as any).building || 'Building'}
                </label>
                <select
                  id="buildingId"
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">{(t as any).noBuilding || 'No Building'}</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                   {(t as any).selectBuildingToAssign || 'Select a building to assign this unit to'}
                </p>
              </div>
              {editingUnit && (
                <div className="mb-4">
                  <label htmlFor="status" className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {t.status} *
                  </label>
                  <select
                    id="status"
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'FREE' | 'BUSY' | 'MAINTENANCE' })}
                    className={`w-full rounded-md border-gray-300 shadow-sm px-3 py-2 ${
                    darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  >
                    <option value="FREE">{t.free}</option>
                    <option value="BUSY">{t.busy}</option>
                    <option value="MAINTENANCE">{t.maintenance}</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    darkMode ? 'bg-blue-600/20 text-white hover:bg-blue-600/30' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
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

