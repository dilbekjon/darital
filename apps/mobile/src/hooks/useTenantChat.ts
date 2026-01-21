import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../lib/constants-fallback';
import type { Conversation, Message } from '../lib/chatApi';

// Lazy load URLs to avoid calling getApiUrl() at module load time
function getApiBase(): string {
  return getApiUrl();
}

function getSocketUrl(): string {
  return getApiBase().replace('/api', '');
}

// Singleton socket instance to prevent multiple connections
let socketInstance: Socket | null = null;
let socketInitializing = false;

interface UseTenantChatReturn {
  loading: boolean;
  error: string | null;
  conversations: Conversation[];
  messages: Message[];
  connected: boolean;
  currentConversation: Conversation | null;
  refreshConversations: () => Promise<void>;
  refreshMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (topic?: string, initialMessage?: string) => Promise<Conversation | null>;
}

export function useTenantChat(): UseTenantChatReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const activeConversationId = useRef<string | null>(null);

  // Initialize socket connection (singleton pattern)
  const initSocket = useCallback(async () => {
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      setConnected(true);
      return socketInstance;
    }

    if (socketInitializing) {
      // Wait for existing initialization
      return new Promise<Socket | null>((resolve) => {
        const checkInterval = setInterval(() => {
          if (socketInstance && !socketInitializing) {
            clearInterval(checkInterval);
            socketRef.current = socketInstance;
            setConnected(socketInstance.connected);
            resolve(socketInstance);
          }
        }, 100);
      });
    }

    socketInitializing = true;

    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('[useTenantChat] No auth token found');
        socketInitializing = false;
        return null;
      }

      console.log('[useTenantChat] Initializing socket connection...');

      const socket = io(`${getSocketUrl()}/chat`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('[useTenantChat] ✅ Socket connected');
        setConnected(true);
        setError(null);
        
        // Rejoin active conversation room if we have one
        if (activeConversationId.current) {
          socket.emit('join_conversation', { conversationId: activeConversationId.current });
          console.log(`[useTenantChat] 📥 Rejoined conversation room after reconnect: conversation:${activeConversationId.current}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('[useTenantChat] 🔌 Socket disconnected');
        setConnected(false);
      });

      socket.on('error', (err: any) => {
        console.warn('[useTenantChat] ❌ Socket error:', err);
        setError(err.message || 'Socket connection error');
      });

      // Listen for both message_created (new) and message_received (backward compat)
      // Use a stable handler that checks activeConversationId at the time of event
      const handleNewMessage = (message: Message) => {
        const currentConvId = activeConversationId.current;
        console.log(`[useTenantChat] 📨 New message received: ${message.id}, conversationId: ${message.conversationId}, activeConversationId: ${currentConvId}`);
        
        // Only add message if it belongs to active conversation
        if (currentConvId && currentConvId === message.conversationId) {
          console.log(`[useTenantChat] ✅ Message matches active conversation, adding to state`);
          setMessages((prev) => {
            // Avoid duplicates (check by ID)
            const exists = prev.some((m) => m.id === message.id);
            if (exists) {
              console.log('[useTenantChat] ⚠️  Message already exists, skipping duplicate');
              return prev;
            }
            
            // Also remove temporary optimistic messages with same content
            const withoutTemp = prev.filter((m) => 
              !m.id.startsWith('temp-') || m.content !== message.content
            );
            
            console.log(`[useTenantChat] ✅ Adding message ${message.id} to state (prev count: ${prev.length}, new count: ${withoutTemp.length + 1})`);
            return [...withoutTemp, message];
          });
        } else {
          console.log(`[useTenantChat] ⚠️  Message ignored - conversationId mismatch or no active conversation`);
        }
      };

      socket.on('message_created', handleNewMessage);
      socket.on('message_received', handleNewMessage);

      // Listen for conversation updates (assign, close, etc.)
      socket.on('conversation_updated', (data: { conversation: Conversation }) => {
        console.log('[useTenantChat] 🔄 Conversation updated:', data.conversation.id);
        
        // Update conversations list
        setConversations((prev) => {
          const updated = prev.map((conv) => 
            conv.id === data.conversation.id ? { ...conv, ...data.conversation } : conv
          );
          // If conversation not in list, add it
          if (!prev.find(c => c.id === data.conversation.id)) {
            return [...updated, data.conversation];
          }
          return updated;
        });
        
        // Update current conversation if it's the active one
        if (activeConversationId.current === data.conversation.id) {
          setCurrentConversation(data.conversation);
        }
      });

      // Listen for unread count updates
      socket.on('unread_count_updated', () => {
        console.log('[useTenantChat] 📊 Unread count updated');
        // Optionally refresh conversations to get updated unread counts
        refreshConversations();
      });

      // Listen for errors (e.g., CONVERSATION_CLOSED)
      socket.on('error', (err: any) => {
        console.warn('[useTenantChat] ❌ Socket error:', err);
        if (err.code === 'CONVERSATION_CLOSED') {
          setError('This conversation is closed. You cannot send messages.');
        } else {
          setError(err.message || 'Socket error');
        }
      });

      socketInstance = socket;
      socketRef.current = socket;
      socketInitializing = false;

      return socket;
    } catch (err) {
      console.error('[useTenantChat] Failed to initialize socket:', err);
      socketInitializing = false;
      return null;
    }
  }, []);

  // Initialize socket on mount
  useEffect(() => {
    initSocket();

    return () => {
      // Don't disconnect singleton socket on unmount
      // It will be reused by other screens
    };
  }, [initSocket]);

  // Helper: Get auth headers
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  };

  // Load conversations
  const refreshConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${getApiBase()}/conversations`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load conversations: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Remove duplicates by ID
      const uniqueConversations = Array.isArray(data) 
        ? data.filter((conv: Conversation, index: number, self: Conversation[]) => 
            index === self.findIndex((c) => c.id === conv.id)
          )
        : [];
      
      setConversations(uniqueConversations);
      
      console.log(`[useTenantChat] ✅ Loaded ${uniqueConversations.length} conversations`);
    } catch (err: any) {
      console.warn('[useTenantChat] Error loading conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for a conversation
  const refreshMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Leave previous conversation room if switching
      const socket = socketRef.current || socketInstance;
      if (socket && socket.connected && activeConversationId.current && activeConversationId.current !== conversationId) {
        socket.emit('leave_conversation', { conversationId: activeConversationId.current });
        console.log(`[useTenantChat] 📤 Left previous conversation room: ${activeConversationId.current}`);
      }
      
      activeConversationId.current = conversationId;

      const headers = await getAuthHeaders();
      const response = await fetch(`${getApiBase()}/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load messages: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setMessages(data);
      
      console.log(`[useTenantChat] ✅ Loaded ${data.length} messages for conversation ${conversationId}`);

      // Join conversation room via socket (ensure we're connected first)
      if (socket) {
        if (socket.connected) {
          socket.emit('join_conversation', { conversationId });
          console.log(`[useTenantChat] 📥 Joined conversation room: conversation:${conversationId}`);
        } else {
          // If not connected, wait for connection then join
          const onConnect = () => {
            socket.emit('join_conversation', { conversationId });
            console.log(`[useTenantChat] 📥 Joined conversation room after reconnect: conversation:${conversationId}`);
            socket.off('connect', onConnect);
          };
          socket.once('connect', onConnect);
        }
      }
    } catch (err: any) {
      console.warn('[useTenantChat] Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup: leave room when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      const socket = socketRef.current || socketInstance;
      if (socket && socket.connected && activeConversationId.current) {
        socket.emit('leave_conversation', { conversationId: activeConversationId.current });
        console.log(`[useTenantChat] 📤 Left conversation room on cleanup: ${activeConversationId.current}`);
      }
    };
  }, []);

  // Helper: Base64 decode (React Native compatible)
  const base64Decode = (str: string): string => {
    try {
      // Try native atob first (available in modern React Native/Expo)
      if (typeof atob !== 'undefined') {
        return atob(str);
      }
      // Fallback: manual base64 decode (no Buffer in React Native)
    } catch {
      // Fall through to manual decode
    }
    
    // Manual base64 decode as fallback
    {
      // Manual base64 decode as last resort
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      str = str.replace(/[^A-Za-z0-9+/=]/g, '');
      
      for (let i = 0; i < str.length; i += 4) {
        const enc1 = chars.indexOf(str.charAt(i));
        const enc2 = chars.indexOf(str.charAt(i + 1));
        const enc3 = chars.indexOf(str.charAt(i + 2));
        const enc4 = chars.indexOf(str.charAt(i + 3));
        
        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;
        
        output += String.fromCharCode(chr1);
        if (enc3 !== 64) output += String.fromCharCode(chr2);
        if (enc4 !== 64) output += String.fromCharCode(chr3);
      }
      return output;
    }
  };

  // Helper: Get user ID from JWT token
  const getUserIdFromToken = async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return null;

      // Decode JWT (without verification - just reading the payload)
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = base64Decode(payloadBase64);
      const payload = JSON.parse(payloadJson);
      
      console.log('[useTenantChat] Decoded user ID from token:', payload.sub);
      return payload.sub || payload.id || null;
    } catch (err) {
      console.warn('[useTenantChat] Failed to decode token:', err);
      return null;
    }
  };

  // Send message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    try {
      const socket = socketRef.current || socketInstance;
      
      if (!socket || !socket.connected) {
        throw new Error('Not connected to chat server');
      }

      // Get the correct user ID from JWT token (matches authenticated user)
      const senderId = await getUserIdFromToken();
      
      if (!senderId) {
        throw new Error('Could not determine user ID from token');
      }

      // Optimistically add message to UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderRole: 'TENANT',
        senderId,
        content,
        status: 'SENT',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Emit via socket - backend will verify senderId matches authenticated user
      socket.emit('send_message', {
        conversationId,
        senderRole: 'TENANT',
        senderId,
        content,
      });

      console.log('[useTenantChat] ✅ Message sent via socket');
    } catch (err: any) {
      console.warn('[useTenantChat] Error sending message:', err);
      setError(err.message || 'Failed to send message');
      throw err;
    }
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (topic?: string, initialMessage?: string): Promise<Conversation | null> => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${getApiBase()}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: topic || null,
          content: initialMessage || 'Hello, I need assistance',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create conversation: ${response.status} ${errorText}`);
      }

      const conversation = await response.json();
      console.log('[useTenantChat] ✅ Conversation created:', conversation.id, 'Topic:', topic || 'General');

      // Update conversations list intelligently
      setConversations((prev) => {
        // Check if conversation already exists
        const existingIndex = prev.findIndex((c) => c.id === conversation.id);
        
        if (existingIndex !== -1) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = conversation;
          console.log('[useTenantChat] Updated existing conversation in list');
          return updated;
        } else {
          // Add new conversation to the beginning
          console.log('[useTenantChat] Added new conversation to list');
          return [conversation, ...prev];
        }
      });

      return conversation;
    } catch (err: any) {
      console.warn('[useTenantChat] Error creating conversation:', err);
      setError(err.message || 'Failed to create conversation');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    conversations,
    messages,
    connected,
    currentConversation,
    refreshConversations,
    refreshMessages,
    sendMessage,
    createConversation,
  };
}

