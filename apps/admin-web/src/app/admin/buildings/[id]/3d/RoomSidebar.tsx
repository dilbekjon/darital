'use client';

import React from 'react';
import type { Room3D } from './types';

interface RoomSidebarProps {
  room: Room3D | null;
  onClose: () => void;
  onAssignTenant: (room: Room3D) => void;
  onUnassignTenant: (room: Room3D) => void;
  darkMode?: boolean;
}

export function RoomSidebar({
  room,
  onClose,
  onAssignTenant,
  onUnassignTenant,
  darkMode = false,
}: RoomSidebarProps) {
  if (!room) return null;

  const areaM2 = room.area ?? room.width * room.depth;

  return (
    <div
      className={`w-80 shrink-0 border-l flex flex-col ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Room details</h3>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          ×
        </button>
      </div>
      <div className={`p-4 space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <p><span className="font-medium">Number:</span> {room.name}</p>
        <p><span className="font-medium">Size:</span> {areaM2.toFixed(1)} m²</p>
        <p>
          <span className="font-medium">Status:</span>{' '}
          <span
            className={
              room.status === 'occupied'
                ? 'text-green-600'
                : room.status === 'maintenance'
                  ? 'text-amber-600'
                  : 'text-gray-500'
            }
          >
            {room.status === 'occupied' ? 'Occupied' : room.status === 'maintenance' ? 'Maintenance' : 'Vacant'}
          </span>
        </p>
        {room.tenantName && <p><span className="font-medium">Tenant:</span> {room.tenantName}</p>}
        <p><span className="font-medium">Price:</span> {room.price.toLocaleString()} / month</p>
      </div>
      <div className="p-4 mt-auto space-y-2 border-t border-gray-200 dark:border-gray-700">
        {room.status === 'vacant' || room.status === 'maintenance' ? (
          <button
            type="button"
            onClick={() => onAssignTenant(room)}
            className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Assign tenant
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUnassignTenant(room)}
            className="w-full py-2 px-4 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            Unassign tenant
          </button>
        )}
      </div>
    </div>
  );
}
