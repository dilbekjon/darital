'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../../../../lib/api';
import type { Room3D } from './types';

interface Tenant {
  id: string;
  fullName: string;
  phone: string;
}

interface AssignTenantModalProps {
  room: Room3D | null;
  onClose: () => void;
  onSuccess: () => void;
  darkMode?: boolean;
}

export function AssignTenantModal({ room, onClose, onSuccess, darkMode }: AssignTenantModalProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!room) return;
    const load = async () => {
      try {
        const data = await fetchApi<Tenant[]>('/tenants');
        setTenants(data.filter((t: any) => !t.isArchived));
      } catch (e) {
        setError('Failed to load tenants');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [room]);

  useEffect(() => {
    if (room) {
      setAmount(String(room.price));
    }
  }, [room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !tenantId || !startDate || !endDate || !amount.trim() || !file) {
      setError('Please fill all fields and upload a contract PDF.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('tenantId', tenantId);
      formData.append('unitId', room.id);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('amount', amount.trim());
      formData.append('file', file);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase}/contracts`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to create contract');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign tenant');
    } finally {
      setSubmitting(false);
    }
  };

  if (!room) return null;

  const isDark = darkMode ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-lg shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Assign tenant to {room.name}
        </h3>
        {error && (
          <div className="mb-4 p-2 rounded bg-red-100 text-red-700 text-sm">{error}</div>
        )}
        {loading ? (
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading tenants...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tenant *</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
                className={`w-full rounded border px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">Select tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName} ({t.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Start date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={`w-full rounded border px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>End date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={`w-full rounded border px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount *</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 1000000"
                className={`w-full rounded border px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contract PDF *</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className={`w-full text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2 rounded-lg ${isDark ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Assign'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
