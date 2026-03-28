'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { NoAccess } from '../../../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { fetchApi } from '../../../../../lib/api';

interface BuildingUnit {
  id: string;
  name: string;
  area?: number | null;
  floor?: number | null;
  occupiedFloors?: number[];
  status: 'FREE' | 'BUSY' | 'MAINTENANCE';
  contracts?: Array<{ id: string; tenant?: { id: string; fullName: string } }>;
}

interface BuildingDetail {
  id: string;
  name: string;
  address?: string | null;
  floorsCount?: number;
  units: BuildingUnit[];
}

const statusStyles: Record<BuildingUnit['status'], string> = {
  FREE: 'border-blue-200 bg-blue-50 text-blue-900',
  BUSY: 'border-green-200 bg-green-50 text-green-900',
  MAINTENANCE: 'border-amber-200 bg-amber-50 text-amber-900',
};

const darkStatusStyles: Record<BuildingUnit['status'], string> = {
  FREE: 'border-blue-800 bg-blue-950/40 text-blue-100',
  BUSY: 'border-green-800 bg-green-950/40 text-green-100',
  MAINTENANCE: 'border-amber-800 bg-amber-950/40 text-amber-100',
};

export default function BuildingFloorPlanPage() {
  const params = useParams();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const { darkMode } = useTheme();
  const buildingId = typeof params?.id === 'string' ? params.id : null;

  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBuilding = useCallback(async () => {
    if (!buildingId) return;
    setPageLoading(true);
    setError(null);
    try {
      const data = await fetchApi<BuildingDetail>(`/buildings/${buildingId}`);
      setBuilding(data);
    } catch (e) {
      setError('Bino ma’lumotlarini yuklashda xato yuz berdi.');
      setBuilding(null);
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

  const floors = useMemo(() => {
    const floorsCount = Math.max(1, building?.floorsCount ?? 1);
    return Array.from({ length: floorsCount }, (_, index) => index + 1).reverse();
  }, [building?.floorsCount]);

  const unitsByFloor = useMemo(() => {
    const grouped: Record<number, BuildingUnit[]> = {};
    for (const floor of floors) grouped[floor] = [];

    for (const unit of building?.units ?? []) {
      const occupiedFloors = unit.occupiedFloors && unit.occupiedFloors.length
        ? unit.occupiedFloors
        : unit.floor
        ? [unit.floor]
        : [1];

      for (const floor of occupiedFloors) {
        if (!grouped[floor]) grouped[floor] = [];
        grouped[floor].push(unit);
      }
    }

    for (const floor of Object.keys(grouped)) {
      grouped[Number(floor)] = grouped[Number(floor)].sort((left, right) => left.name.localeCompare(right.name));
    }

    return grouped;
  }, [building?.units, floors]);

  if (!authLoading && (!user || !hasPermission('buildings.read'))) {
    return <NoAccess />;
  }

  return (
    <div className={`min-h-screen p-4 sm:p-6 ${darkMode ? 'bg-black' : 'bg-slate-100'}`}>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Buildings', href: '/admin/buildings' },
          { label: building?.name ?? 'Building', href: '/admin/buildings' },
          { label: '2D View', href: '#' },
        ]}
      />

      {pageLoading ? (
        <div className={`mt-6 rounded-3xl border p-10 text-center ${darkMode ? 'border-gray-800 bg-gray-950 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
          Yuklanmoqda...
        </div>
      ) : null}

      {error ? (
        <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${darkMode ? 'border-red-900 bg-red-950/50 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {error}
        </div>
      ) : null}

      {building && !pageLoading ? (
        <div className="mt-6 space-y-6">
          <div className={`rounded-3xl border p-6 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className={`text-3xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{building.name}</h1>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  {building.address || 'Manzil kiritilmagan'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className={`rounded-2xl px-4 py-3 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-slate-700'}`}>
                  <div className="text-xs uppercase tracking-wide opacity-70">Qavatlar</div>
                  <div className="mt-1 text-xl font-semibold">{Math.max(1, building.floorsCount ?? 1)}</div>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-slate-700'}`}>
                  <div className="text-xs uppercase tracking-wide opacity-70">Xonalar</div>
                  <div className="mt-1 text-xl font-semibold">{building.units.length}</div>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-slate-700'}`}>
                  <div className="text-xs uppercase tracking-wide opacity-70">Ko‘rinish</div>
                  <div className="mt-1 text-xl font-semibold">2D</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {floors.map((floor) => {
              const floorUnits = unitsByFloor[floor] ?? [];

              return (
                <section
                  key={floor}
                  className={`rounded-3xl border p-5 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Qavat {floor}</h2>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        {floorUnits.length} ta xona ko‘rinmoqda
                      </p>
                    </div>
                  </div>

                  {floorUnits.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed p-6 text-center text-sm ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-slate-400'}`}>
                      Bu qavatda xona yo‘q.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {floorUnits.map((unit) => {
                        const occupiedFloors = unit.occupiedFloors && unit.occupiedFloors.length
                          ? unit.occupiedFloors
                          : unit.floor
                          ? [unit.floor]
                          : [floor];
                        const tenantName = unit.contracts?.[0]?.tenant?.fullName;

                        return (
                          <div
                            key={`${floor}-${unit.id}`}
                            className={`rounded-2xl border p-4 shadow-sm ${darkMode ? darkStatusStyles[unit.status] : statusStyles[unit.status]}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-lg font-semibold">{unit.name}</h3>
                                <p className="text-sm opacity-80">
                                  {unit.area ? `${unit.area} m²` : 'Maydon kiritilmagan'}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-xs font-medium ${darkMode ? 'bg-black/20 text-white' : 'bg-white/80 text-slate-700'}`}>
                                {occupiedFloors.length > 1 ? `${occupiedFloors.join(', ')}-qavatlar` : `Qavat ${occupiedFloors[0]}`}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                              <div className={`rounded-xl px-3 py-2 ${darkMode ? 'bg-black/20' : 'bg-white/70'}`}>
                                <div className="opacity-60">Holat</div>
                                <div className="mt-1 font-medium">
                                  {unit.status === 'FREE' ? 'Bo‘sh' : unit.status === 'BUSY' ? 'Band' : 'Ta’mir'}
                                </div>
                              </div>
                              <div className={`rounded-xl px-3 py-2 ${darkMode ? 'bg-black/20' : 'bg-white/70'}`}>
                                <div className="opacity-60">Ijarachi</div>
                                <div className="mt-1 font-medium">{tenantName || 'Biriktirilmagan'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
