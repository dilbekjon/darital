'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi, normalizeListResponse } from '../lib/api';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface Payment {
  id: string;
  status: string;
  method: string;
}

/**
 * Hook to fetch and maintain pending payments count (for admin verification)
 * Updates automatically when payments are created or verified via socket
 */
export function usePendingPaymentsCount() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch pending payments count (only ONLINE PENDING payments)
  const fetchCount = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchApi<any>('/payments?limit=1000&status=PENDING');
      const payments = normalizeListResponse<Payment>(data).items;
      // Count only ONLINE pending payments that need verification
      const pendingOnlineCount = payments.filter(p => p.method === 'ONLINE').length;
      setCount(pendingOnlineCount);
    } catch (err: any) {
      console.error('[usePendingPaymentsCount] Error fetching pending payments count:', err);
      setError(err.message || 'Failed to fetch pending payments count');
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Set up socket connection to listen for payment updates
  useEffect(() => {
    const token = getToken();
    
    if (!token) {
      return;
    }

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connected', () => {
      console.log('[usePendingPaymentsCount] Socket connected');
    });

    // Listen for payment_updated events (when payment is created or verified)
    socket.on('payment_updated', () => {
      console.log('[usePendingPaymentsCount] Payment updated event received, refreshing count');
      fetchCount();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchCount]);

  // Poll for updates every 30 seconds as a fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchCount]);

  return {
    count,
    loading,
    error,
    refresh: fetchCount,
  };
}
