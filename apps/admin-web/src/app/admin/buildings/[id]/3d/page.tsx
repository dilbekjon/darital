'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { NoAccess } from '../../../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { fetchApi } from '../../../../../lib/api';
import {
  buildBuilding3DFromApi,
  getMockBuilding3D,
  type Building3DData,
  type Room3D,
} from './types';
import { RoomSidebar } from './RoomSidebar';
import { AssignTenantModal } from './AssignTenantModal';

const Building3DViewer = dynamic(
  () => import('./Building3DViewer').then((m) => ({ default: m.Building3DViewer })),
  { ssr: false, loading: () => <div className="w-full h-[500px] bg-gray-900 animate-pulse flex items-center justify-center text-gray-500">Loading 3D...</div> },
);

export default function Building3DPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const { darkMode } = useTheme();
  const buildingId = typeof params?.id === 'string' ? params.id : null;

  const [building, setBuilding] = useState<Building3DData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room3D | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const loadBuilding = useCallback(async () => {
    if (!buildingId) return;
    setPageLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any>(`/buildings/${buildingId}`);
      setBuilding(buildBuilding3DFromApi(data));
    } catch (e) {
      setError('Failed to load building. Showing demo data.');
      setBuilding(getMockBuilding3D());
    } finally {
      setPageLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    if (!authLoading && user && buildingId && hasPermission('buildings.read')) {
      loadBuilding();
    } else if (!authLoading) {
      setPageLoading(false);
    }
  }, [authLoading, user, buildingId, hasPermission, loadBuilding]);

  const handleAssignTenant = (room: Room3D) => {
    setShowAssignModal(true);
  };

  const handleUnassignTenant = async (room: Room3D) => {
    if (!room.contractId) return;
    if (!confirm(`Unassign tenant from ${room.name}? This will cancel the active contract.`)) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await fetch(`${apiBase}/contracts/${room.contractId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      await loadBuilding();
      setSelectedRoom(null);
    } catch (e) {
      alert('Failed to unassign tenant');
    }
  };

  const handleAssignSuccess = () => {
    loadBuilding();
    setShowAssignModal(false);
    if (selectedRoom) {
      const updated = building?.rooms.find((r) => r.id === selectedRoom.id);
      if (updated) setSelectedRoom(updated);
    }
  };

  if (!authLoading && (!user || !hasPermission('buildings.read'))) {
    return <NoAccess />;
  }

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Buildings', href: '/admin/buildings' },
          { label: building?.name ?? 'Building', href: buildingId ? `/admin/buildings/${buildingId}` : '/admin/buildings' },
          { label: '3D View', href: '#' },
        ]}
      />

      {pageLoading ? (
        <div className="flex items-center justify-center h-[500px] text-gray-500">Loading building...</div>
      ) : error && building ? (
        <div className="mb-4 p-3 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm">
          {error}
        </div>
      ) : null}

      {!building && !pageLoading && (
        <div className="text-center py-12 text-gray-500">Building not found.</div>
      )}

      {building && (
        <div className="flex gap-0 h-[calc(100vh-180px)] min-h-[520px]">
          <div className="flex-1 min-w-0">
            <Building3DViewer
              building={building}
              selectedRoom={selectedRoom}
              onSelectRoom={setSelectedRoom}
            />
          </div>
          <RoomSidebar
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
            onAssignTenant={handleAssignTenant}
            onUnassignTenant={handleUnassignTenant}
            darkMode={darkMode}
          />
        </div>
      )}

      {showAssignModal && selectedRoom && (
        <AssignTenantModal
          room={selectedRoom}
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
