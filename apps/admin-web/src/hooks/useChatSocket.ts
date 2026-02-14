'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '../lib/chatApi';
import { getToken } from '../lib/auth';
import { getSocketBaseUrl } from '../lib/api';

interface UseChatSocketOptions {
  conversationId?: string;
  onMessageReceived?: (message: Message) => void;
  onMessagesRead?: (data: { conversationId: string; readBy: string }) => void;
  onUserTyping?: (data: { userId: string; email: string }) => void;
  onConversationUpdated?: (data: { conversation: any }) => void;
  onUnreadCountUpdated?: () => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const { conversationId, onMessageReceived, onMessagesRead, onUserTyping, onConversationUpdated, onUnreadCountUpdated } = options;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const token = getToken();
    
    if (!token) {
      setError('No authentication token found');
      return;
    }

    console.log('🔌 Connecting to chat socket...');

    const socketInstance = io(`${getSocketBaseUrl()}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connected', (data) => {
      console.log('✅ Connected to chat:', data);
      setConnected(true);
      setError(null);
    });

    socketInstance.on('error', (err) => {
      console.error('❌ Socket error:', err);
      setError(err.message || 'Socket error');
      setConnected(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from chat');
      setConnected(false);
    });

    // Listen for both message_created (new) and message_received (backward compat)
    const handleNewMessage = (message: Message) => {
      console.log('📨 Message received:', message);
      onMessageReceived?.(message);
    };

    socketInstance.on('message_created', handleNewMessage);
    socketInstance.on('message_received', handleNewMessage);

    socketInstance.on('messages_read', (data) => {
      console.log('👁️ Messages read:', data);
      onMessagesRead?.(data);
    });

    socketInstance.on('user_typing', (data) => {
      onUserTyping?.(data);
    });

    socketInstance.on('conversation_updated', (data) => {
      console.log('🔄 Conversation updated:', data);
      onConversationUpdated?.(data);
    });

    socketInstance.on('unread_count_updated', () => {
      console.log('📊 Unread count updated');
      onUnreadCountUpdated?.();
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, []); // Only run once on mount

  // Join conversation when conversationId changes
  useEffect(() => {
    if (socket && connected && conversationId) {
      console.log('📥 Joining conversation:', conversationId);
      
      socket.emit('join_conversation', { conversationId });

      const handleJoined = (data: any) => {
        console.log('✅ Joined conversation:', data);
      };
      socket.on('joined_conversation', handleJoined);

      // Cleanup: leave room when conversationId changes or component unmounts
      return () => {
        console.log('📤 Leaving conversation:', conversationId);
        socket.emit('leave_conversation', { conversationId });
        socket.off('joined_conversation', handleJoined);
      };
    }
  }, [socket, connected, conversationId]);

  // Send message
  const sendMessage = useCallback((
    content: string,
    senderId: string,
    conversationId: string,
    senderRole?: 'TENANT' | 'ADMIN'
  ) => {
    if (!socket || !connected) {
      console.error('Socket not connected');
      return;
    }

    // Determine role from token if not provided
    let role = senderRole;
    if (!role) {
      try {
        const token = getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Map role to chat role (TENANT stays TENANT, ADMIN/SUPER_ADMIN becomes ADMIN)
          const userRole = String(payload.role).toUpperCase();
          role = userRole === 'TENANT' ? 'TENANT' : 'ADMIN';
        } else {
          role = 'ADMIN'; // Default fallback
        }
      } catch (error) {
        console.error('Failed to determine role from token:', error);
        role = 'ADMIN'; // Default fallback
      }
    }

    console.log(`[ChatSocket] Sending message as ${role}`);

    socket.emit('send_message', {
      conversationId,
      senderRole: role,
      senderId,
      content,
    });
  }, [socket, connected]);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: string) => {
    if (!socket || !connected) return;

    socket.emit('mark_read', { conversationId });
  }, [socket, connected]);

  // Send typing indicator
  const sendTyping = useCallback((conversationId: string) => {
    if (!socket || !connected) return;

    socket.emit('typing', { conversationId });
  }, [socket, connected]);

  // Send stop typing indicator
  const sendStopTyping = useCallback((conversationId: string) => {
    if (!socket || !connected) return;

    socket.emit('stop_typing', { conversationId });
  }, [socket, connected]);

  return {
    socket,
    connected,
    error,
    sendMessage,
    markAsRead,
    sendTyping,
    sendStopTyping,
  };
}

