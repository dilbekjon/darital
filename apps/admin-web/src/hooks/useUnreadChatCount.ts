'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadCount } from '../lib/chatApi';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

/**
 * Hook to fetch and maintain unread chat count
 * Updates automatically when new messages are received via socket
 */
export function useUnreadChatCount() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch unread count
  const fetchCount = useCallback(async () => {
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
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Set up socket connection to listen for new messages
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!token) {
      return;
    }

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connected', () => {
      console.log('[useUnreadChatCount] Socket connected');
    });

    // Listen for unread count updates (emitted when tenant sends message or admin reads)
    socket.on('unread_count_updated', () => {
      console.log('[useUnreadChatCount] Unread count updated event received, refreshing count');
      fetchCount();
    });

    // Also listen for new messages as backup
    socket.on('message_received', () => {
      console.log('[useUnreadChatCount] New message received, refreshing count');
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

