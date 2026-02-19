'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';
import DaritalLoader from '../../../components/DaritalLoader';

interface Unit {
  id: string;
  name: string;
  status: string;
  price: number;
  floor: number | null;
  area?: number;
  contracts?: { tenant?: { fullName: string } }[];
}

interface Building {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  totalUnits: number;
  occupiedUnits: number;
  freeUnits: number;
  units: Unit[];
  areaType?: 'OPEN_AREA' | 'BUILDING';
  floorsCount?: number;
  createdAt: string;
}

export default function BuildingsPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    areaType: 'BUILDING' as 'OPEN_AREA' | 'BUILDING',
    floorsCount: 0,
  });
  const [saving, setSaving] = useState(false);
  const [detailBuilding, setDetailBuilding] = useState<Building | null>(null);
  const [detailUnitsByFloor, setDetailUnitsByFloor] = useState<Record<number, Unit[]>>({});
  const [addUnitsFloor, setAddUnitsFloor] = useState<number>(0);
  const [addUnitsRows, setAddUnitsRows] = useState<Array<{ name: string; area: string; price: string }>>([{ name: '', area: '', price: '' }]);
  const [showAddUnitsModal, setShowAddUnitsModal] = useState(false);
  const [addingUnits, setAddingUnits] = useState(false);

  const loadBuildings = async () => {
    try {
      const data = await fetchApi<Building[]>('/buildings');
      setBuildings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load buildings');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user && hasPermission('units.read')) {
      loadBuildings();
    } else if (!loading) {
      setPageLoading(false);
    }
  }, [loading, user, hasPermission]);

  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return buildings;
    const query = searchQuery.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.address?.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query)
    );
  }, [buildings, searchQuery]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      await fetchApi('/buildings', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || undefined,
          description: formData.description || undefined,
          areaType: 'BUILDING',
          floorsCount: formData.floorsCount,
        }),
      });
      setShowCreateModal(false);
      setFormData({ name: '', address: '', description: '', areaType: 'BUILDING', floorsCount: 0 });
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert('Failed to create building');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBuilding || !formData.name.trim()) return;
    setSaving(true);
    try {
      await fetchApi(`/buildings/${selectedBuilding.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || undefined,
          description: formData.description || undefined,
          areaType: 'BUILDING',
          floorsCount: formData.floorsCount,
        }),
      });
      setShowEditModal(false);
      setSelectedBuilding(null);
      setFormData({ name: '', address: '', description: '', areaType: 'BUILDING', floorsCount: 0 });
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert('Failed to update building');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (building: Building) => {
    setDetailBuilding(building);
    try {
      const data = await fetchApi<{
        unitsByFloor: Record<string, Unit[]>;
        units: Unit[];
      }>(`/buildings/${building.id}`);
      const byFloor: Record<number, Unit[]> = {};
      if (data.unitsByFloor) {
        for (const [f, list] of Object.entries(data.unitsByFloor)) {
          byFloor[Number(f)] = list || [];
        }
      }
      setDetailUnitsByFloor(byFloor);
    } catch {
      setDetailUnitsByFloor({});
    }
  };

  const openAddUnitsModal = (floor: number) => {
    setAddUnitsFloor(floor);
    setAddUnitsRows([{ name: '', area: '', price: '' }]);
    setShowAddUnitsModal(true);
  };

  const handleBulkAddUnits = async () => {
    if (!detailBuilding) return;
    const units = addUnitsRows
      .filter((r) => r.name.trim() && r.price.trim())
      .map((r) => ({
        name: r.name.trim(),
        area: r.area ? parseFloat(r.area) : undefined,
        price: parseFloat(r.price),
      }));
    if (units.length === 0) {
      alert('Kamida bitta xona nomi va narxini kiriting.');
      return;
    }
    setAddingUnits(true);
    try {
      await fetchApi(`/buildings/${detailBuilding.id}/units/bulk`, {
        method: 'POST',
        body: JSON.stringify({ floor: addUnitsFloor, units }),
      });
      setShowAddUnitsModal(false);
      openDetail(detailBuilding);
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert('Xonalarni qo\'shishda xato');
    } finally {
      setAddingUnits(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this building? Units will be unlinked.')) return;
    try {
      await fetchApi(`/buildings/${id}`, { method: 'DELETE' });
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert('Failed to delete building');
    }
  };

  const openEditModal = (building: Building) => {
    setSelectedBuilding(building);
    setFormData({
      name: building.name,
      address: building.address || '',
      description: building.description || '',
      areaType: building.areaType || 'BUILDING',
      floorsCount: building.floorsCount ?? 0,
    });
    setShowEditModal(true);
  };

  if (loading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('units.read')) {
    return <NoAccess />;
  }

  const totalUnits = buildings.reduce((sum, b) => sum + b.totalUnits, 0);
  const totalOccupied = buildings.reduce((sum, b) => sum + b.occupiedUnits, 0);
  const totalFree = buildings.reduce((sum, b) => sum + b.freeUnits, 0);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t.dashboard, href: '/dashboard' },
            { label: t.buildings || 'Buildings' },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🏢 {t.buildings || 'Building Management'}
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {t.manageBuildingsDesc || 'Organize and manage your properties by building'}
            </p>
          </div>
          {hasPermission('units.create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              + {t.addBuilding || 'Add Building'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.totalBuildings || 'Total Buildings'}</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{buildings.length}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.totalUnits || 'Total Units'}</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{totalUnits}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{t.occupied || 'Occupied'}</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{totalOccupied}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{t.available || 'Available'}</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{totalFree}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={t.searchBuildings || 'Search buildings...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full md:w-96 px-4 py-3 rounded-xl border ${
              darkMode 
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {/* Buildings Grid */}
        {filteredBuildings.length === 0 ? (
          <EmptyState
            icon={<span className="text-6xl">🏢</span>}
            title={buildings.length === 0 ? (t.noBuildings || 'No Buildings') : (t.noResultsFound || 'No Results')}
            description={buildings.length === 0 
              ? (t.createFirstBuilding || 'Create your first building to organize units')
              : (t.tryDifferentSearch || 'Try a different search term')
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings.map((building) => {
              const occupancyRate = building.totalUnits > 0 
                ? Math.round((building.occupiedUnits / building.totalUnits) * 100) 
                : 0;
              
              return (
                <div
                  key={building.id}
                  className={`rounded-xl border overflow-hidden transition-all hover:shadow-xl ${
                    darkMode 
                      ? 'bg-gray-900 border-gray-800 hover:border-blue-500/50' 
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Header with occupancy bar */}
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        🏢 {building.name}
                      </h3>
                      <span className={`text-sm font-medium ${
                        occupancyRate >= 80 ? 'text-green-500' : 
                        occupancyRate >= 50 ? 'text-yellow-500' : 'text-blue-500'
                      }`}>
                        {occupancyRate}% {t.occupied || 'occupied'}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancyRate >= 80 ? 'bg-green-500' : 
                          occupancyRate >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {building.address && (
                      <p className={`text-sm mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        📍 {building.address}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {building.totalUnits}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t.total || 'Total'}</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                        <p className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {building.occupiedUnits}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-green-500' : 'text-green-600'}`}>{t.busy || 'Busy'}</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                        <p className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {building.freeUnits}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>{t.free || 'Free'}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openDetail(building)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          darkMode
                            ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                        }`}
                      >
                        Xonalar / Batafsil
                      </button>
                      <Link
                        href={`/admin/buildings/${building.id}/3d`}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          darkMode
                            ? 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        3D View
                      </Link>
                      <button
                        onClick={() => openEditModal(building)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          darkMode
                            ? 'bg-gray-800 hover:bg-gray-700 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        ✏️ {t.edit || 'Edit'}
                      </button>
                      {hasPermission('units.delete') && (
                        <button
                          onClick={() => handleDelete(building.id)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            darkMode
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              : 'bg-red-100 hover:bg-red-200 text-red-600'
                          }`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${
            darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Hudud qo'shish (ochiq maydon yoki bino)
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  1. Qavatlar soni
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.floorsCount}
                  onChange={(e) => setFormData({ ...formData, floorsCount: parseInt(e.target.value, 10) || 0 })}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="2"
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  2. Bino nomi *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Bino nomi"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Manzil
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={t.addressPlaceholder || 'Manzil'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.description || 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={t.descriptionPlaceholder || 'Ixtiyoriy'}
                />
              </div>
            </div>
            <div className={`p-6 border-t flex gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {saving ? '...' : (t.create || 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${
            darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Hududni tahrirlash
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Qavatlar soni
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.floorsCount}
                  onChange={(e) => setFormData({ ...formData, floorsCount: parseInt(e.target.value, 10) || 0 })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.fullName || 'Bino nomi'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.address || 'Address'}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.description || 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
            <div className={`p-6 border-t flex gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setShowEditModal(false); setSelectedBuilding(null); }}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving || !formData.name.trim()}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {saving ? '...' : (t.save || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal: Hudud → Qavatlar → Xonalar */}
      {detailBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col ${
            darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Bino: {detailBuilding.name}
              </h2>
              <button
                onClick={() => { setDetailBuilding(null); setDetailUnitsByFloor({}); }}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {(detailBuilding.floorsCount ?? 0) > 0
                  ? `${detailBuilding.floorsCount} qavat. Har qavatda xonalarni ketma-ket qo'shing.`
                  : 'Qavatsiz bino. Xonalarni qo\'shing.'}
              </p>
              {(() => {
                const floorsCount = detailBuilding.floorsCount ?? 0;
                const floors = floorsCount > 0
                  ? Array.from({ length: floorsCount }, (_, i) => i)
                  : [0];
                return floors.map((floorIndex) => {
                  const units = detailUnitsByFloor[floorIndex] || [];
                  const free = units.filter((u) => u.status === 'FREE').length;
                  const busy = units.filter((u) => u.status === 'BUSY').length;
                  return (
                    <div key={floorIndex} className={`mb-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className={`px-4 py-2 flex justify-between items-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {floorIndex === 0 && floorsCount === 0 ? 'Xonalar (qavatsiz)' : `Qavat ${floorIndex + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600">{busy} band</span>
                          <span className="text-sm text-blue-600">{free} bo'sh</span>
                          {hasPermission('units.create') && (
                            <button
                              onClick={() => openAddUnitsModal(floorIndex)}
                              className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                              + Xona qo'shish
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {units.length === 0 ? (
                          <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Hona yo'q</span>
                        ) : (
                          units.map((u) => (
                            <span
                              key={u.id}
                              className={`px-2 py-1 rounded text-sm ${
                                u.status === 'BUSY'
                                  ? darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800'
                                  : u.status === 'MAINTENANCE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {u.name} {u.area ? `(${u.area} m²)` : ''} — {u.status === 'BUSY' ? (u.contracts?.[0]?.tenant?.fullName || 'Band') : u.status === 'FREE' ? 'Bo\'sh' : 'Ta\'mir'}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add units modal (ketma-ket) */}
      {showAddUnitsModal && detailBuilding && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Xona qo'shish — {(detailBuilding.floorsCount ?? 0) === 0 ? 'Qavatsiz' : `Qavat ${addUnitsFloor + 1}`}
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {addUnitsRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    placeholder="Xona nomi"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...addUnitsRows];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setAddUnitsRows(next);
                    }}
                    className={`col-span-4 px-3 py-2 rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="m²"
                    value={row.area}
                    onChange={(e) => {
                      const next = [...addUnitsRows];
                      next[idx] = { ...next[idx], area: e.target.value };
                      setAddUnitsRows(next);
                    }}
                    className={`col-span-3 px-3 py-2 rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Narx"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...addUnitsRows];
                      next[idx] = { ...next[idx], price: e.target.value };
                      setAddUnitsRows(next);
                    }}
                    className={`col-span-4 px-3 py-2 rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setAddUnitsRows(addUnitsRows.filter((_, i) => i !== idx))}
                    className="col-span-1 p-2 rounded text-red-500 hover:bg-red-500/10"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAddUnitsRows([...addUnitsRows, { name: '', area: '', price: '' }])}
                className={`w-full py-2 rounded-lg border border-dashed ${darkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                + Qator qo'shish
              </button>
            </div>
            <div className={`p-4 border-t flex gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowAddUnitsModal(false)}
                className={`flex-1 py-2 rounded-xl font-medium ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Bekor
              </button>
              <button
                onClick={handleBulkAddUnits}
                disabled={addingUnits || addUnitsRows.every((r) => !r.name.trim() || !r.price.trim())}
                className="flex-1 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addingUnits ? '...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
