import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from '../lib/chatApi';
import { getApiUrl } from '../lib/constants-fallback';

// Lazy load SOCKET_URL to avoid calling getApiUrl() at module load time
function getSocketUrl(): string {
  return getApiUrl().replace('/api', '');
}

interface UseChatSocketOptions {
  conversationId?: string;
  onMessageReceived?: (message: Message) => void;
  onMessagesRead?: (data: { conversationId: string; readBy: string }) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const { conversationId, onMessageReceived, onMessagesRead } = options;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        
        if (!token) {
          setError('No authentication token found');
          return;
        }

        console.log('🔌 Connecting to chat socket...');

        const socketInstance = io(`${getSocketUrl()}/chat`, {
          auth: {
            token,
          },
          transports: ['websocket', 'polling'],
        });

        socketInstance.on('connected', (data) => {
          if (isMounted) {
            console.log('✅ Connected to chat:', data);
            setConnected(true);
            setError(null);
          }
        });

        socketInstance.on('error', (err) => {
          if (isMounted) {
            console.error('❌ Socket error:', err);
            setError(err.message || 'Socket error');
            setConnected(false);
          }
        });

        socketInstance.on('disconnect', () => {
          if (isMounted) {
            console.log('🔌 Disconnected from chat');
            setConnected(false);
          }
        });

        // Listen for both message_created (new) and message_received (backward compat)
        const handleNewMessage = (message: Message) => {
          if (isMounted) {
            console.log('📨 Message received:', message);
            onMessageReceived?.(message);
          }
        };

        socketInstance.on('message_created', handleNewMessage);
        socketInstance.on('message_received', handleNewMessage);

        socketInstance.on('messages_read', (data) => {
          if (isMounted) {
            console.log('👁️ Messages read:', data);
            onMessagesRead?.(data);
          }
        });

        if (isMounted) {
          socketRef.current = socketInstance;
          setSocket(socketInstance);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to initialize socket:', err);
          setError('Failed to connect');
        }
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection');
        socketRef.current.disconnect();
      }
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
  const sendMessage = useCallback(async (
    content: string,
    conversationId: string
  ) => {
    if (!socket || !connected) {
      console.error('Socket not connected');
      return;
    }

    const senderId = await AsyncStorage.getItem('userId');
    
    socket.emit('send_message', {
      conversationId,
      senderRole: 'TENANT',
      senderId,
      content,
    });
  }, [socket, connected]);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: string) => {
    if (!socket || !connected) return;

    socket.emit('mark_read', { conversationId });
  }, [socket, connected]);

  return {
    socket,
    connected,
    error,
    sendMessage,
    markAsRead,
  };
}

