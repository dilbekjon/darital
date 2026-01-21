'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
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
  createdAt: string;
}

export default function BuildingsPage() {
  const { user, loading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', description: '' });
  const [saving, setSaving] = useState(false);

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
        body: JSON.stringify(formData),
      });
      setShowCreateModal(false);
      setFormData({ name: '', address: '', description: '' });
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
        body: JSON.stringify(formData),
      });
      setShowEditModal(false);
      setSelectedBuilding(null);
      setFormData({ name: '', address: '', description: '' });
      loadBuildings();
    } catch (err) {
      console.error(err);
      alert('Failed to update building');
    } finally {
      setSaving(false);
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(building)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
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
                🏢 {t.addBuilding || 'Add Building'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.fullName || 'Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={(t as any).buildingName || 'Building name'}
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
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={t.addressPlaceholder || 'Street address'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.description || 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={t.descriptionPlaceholder || 'Optional description'}
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
                ✏️ {t.editBuilding || 'Edit Building'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.fullName || 'Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
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
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
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
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
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
    </div>
  );
}
