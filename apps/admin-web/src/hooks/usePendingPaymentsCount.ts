'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi, normalizeListResponse } from '../lib/api';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface Payment {
  id: string;
  status: string;
  method: string;
  providerPaymentId?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

/**
 * Only count PENDING payments that have been received and need admin accept/decline.
 * - OFFLINE PENDING: recorded by collector, needs approval → count.
 * - ONLINE PENDING: count only when payment was actually received (webhook/paid), not just intent created.
 */
function needsApproval(payment: Payment): boolean {
  if (payment.status !== 'PENDING') return false;
  if (payment.method === 'OFFLINE') return true;
  const raw = payment.rawPayload;
  if (!raw) return false;
  if ((raw as any).checkoutUz?.payment?.status === 'paid' || (raw as any).webhook) return true;
  if ((raw as any).status === 'paid' || (raw as any).status === 'success' || (raw as any).paidAt) return true;
  return false;
}

/**
 * Hook to fetch and maintain pending payments count (for admin verification)
 * Only counts payments that are received and need accept/decline — not "awaiting payment".
 * Only fetches when user has payments.read; avoids 403 for roles like SUPPORT (yordamchi).
 */
export function usePendingPaymentsCount() {
  const { hasPermission } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const canReadPayments = hasPermission('payments.read');

  // Fetch pending payments and count only those that need accept/decline (received, awaiting verification)
  const fetchCount = useCallback(async () => {
    if (!canReadPayments) {
      setCount(0);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchApi<any>('/payments?limit=1000&status=PENDING');
      const payments = normalizeListResponse<Payment>(data).items;
      const approvalCount = payments.filter(needsApproval).length;
      setCount(approvalCount);
    } catch (err: any) {
      console.error('[usePendingPaymentsCount] Error fetching pending payments count:', err);
      setError(err.message || 'Failed to fetch pending payments count');
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [canReadPayments]);

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Socket and poll only when user can read payments
  useEffect(() => {
    if (!canReadPayments) return;
    const token = getToken();
    if (!token) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connected', () => {
      console.log('[usePendingPaymentsCount] Socket connected');
    });

    socket.on('payment_updated', () => {
      console.log('[usePendingPaymentsCount] Payment updated event received, refreshing count');
      fetchCount();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [canReadPayments, fetchCount]);

  useEffect(() => {
    if (!canReadPayments) return;
    const interval = setInterval(() => {
      fetchCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [canReadPayments, fetchCount]);

  return {
    count,
    loading,
    error,
    refresh: fetchCount,
  };
}
