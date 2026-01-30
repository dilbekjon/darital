'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount } from '../lib/chatApi';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

/**
 * Hook to fetch and maintain unread chat count.
 * Only fetches when enabled is true (e.g. user has chat.read permission).
 */
export function useUnreadChatCount(enabled: boolean = true) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      const unreadCount = await getUnreadCount();
      setCount(unreadCount);
    } catch (err: any) {
      console.error('[useUnreadChatCount] Error fetching unread count:', err);
      setError(err.message || 'Failed to fetch unread count');
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }
    fetchCount();
  }, [enabled, fetchCount]);

  useEffect(() => {
    if (!enabled) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('unread_count_updated', () => {
      fetchCount();
    });
    socket.on('message_received', () => {
      fetchCount();
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, fetchCount]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      fetchCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [enabled, fetchCount]);

  return {
    count: enabled ? count : 0,
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refresh: fetchCount,
  };
}

