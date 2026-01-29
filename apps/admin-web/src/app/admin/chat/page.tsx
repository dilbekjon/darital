'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatSocket } from '../../../hooks/useChatSocket';
import {
  getConversations,
  getMessages,
  assignConversation,
  unassignConversation,
  closeConversation,
  type Conversation,
  type Message,
} from '../../../lib/chatApi';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import DaritalLoader from '../../../components/DaritalLoader';

export default function AdminChatPage() {
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const { user, loading: authLoading, hasPermission } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'PENDING' | 'CLOSED'>('ALL');
  const [pageLoading, setPageLoading] = useState(true); // Renamed from loading to avoid conflict
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // Check permissions and load data (Chat tab hidden for PAYMENT_COLLECTOR / tolovyiguvchi)
  useEffect(() => {
    if (!authLoading) {
      if (!user || !hasPermission('chat.read') || user.role === 'PAYMENT_COLLECTOR') {
        setPageLoading(false);
        if (user && user.role === 'PAYMENT_COLLECTOR') router.replace('/dashboard');
        return;
      }

      // Get current user ID from token (still needed for socket sender ID)
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login'); // Should be caught by AuthProvider but as a fallback
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub || payload.id);
      } catch (error) {
        console.error('Failed to decode token:', error);
        router.push('/login');
        return;
      }

      loadConversations();
      setPageLoading(false);
    }
  }, [authLoading, user, hasPermission, router]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Show browser notification for new messages
  const showMessageNotification = (message: Message, conversation: Conversation) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // Don't show notification if chat is currently selected or if it's an admin message
      if (selectedConversation?.id === conversation.id || message.senderRole === 'ADMIN') {
        return;
      }

      const notification = new Notification(`New message from ${conversation.tenant.fullName}`, {
        body: message.content?.slice(0, 100) + (message.content && message.content.length > 100 ? '...' : ''),
        icon: '/favicon.ico',
        tag: `chat-${conversation.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        handleSelectConversation(conversation);
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  };

  // Initialize socket
  const { connected, error, sendMessage, markAsRead, sendTyping, sendStopTyping } = useChatSocket({
    conversationId: selectedConversation?.id,
    onMessageReceived: (message) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            const conversation = { ...conv, updatedAt: message.createdAt, messages: [{ id: message.id, content: message.content || '', createdAt: message.createdAt, status: message.status, senderRole: message.senderRole }] };
            // Show notification for new tenant messages
            if (message.senderRole === 'TENANT') {
              showMessageNotification(message, conversation);
            }
            return conversation;
          }
          return conv;
        });
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        markAsRead(message.conversationId);
      }
    },
    onMessagesRead: (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.conversationId === data.conversationId && msg.status !== 'READ'
            ? { ...msg, status: 'READ' as const }
            : msg
        )
      );
    },
    onUserTyping: (data) => {
      setTypingUsers((prev) => new Set(prev).add(data.email));
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.email);
          return next;
        });
      }, 3000);
    },
    onConversationUpdated: (data) => {
      console.log('🔄 Conversation updated event received:', data);
      const updated = data.conversation;
      
      // Update conversations list
      setConversations((prev) => {
        const updatedList = prev.map((conv) => 
          conv.id === updated.id ? { ...conv, ...updated } : conv
        );
        return updatedList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      
      // Update selected conversation if it's the one that was updated
      if (selectedConversation && selectedConversation.id === updated.id) {
        console.log('🔄 Updating selected conversation state:', updated);
        setSelectedConversation({ ...selectedConversation, ...updated });
      }
    },
    onUnreadCountUpdated: () => {
      // Reload conversations to get updated unread counts
      loadConversations();
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations from API
  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
      // Don't auto-select - let user choose which conversation to open
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Load messages for selected conversation
  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    try {
      const data = await getMessages(conversation.id);
      setMessages(data);
      markAsRead(conversation.id);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !currentUserId || sending) return;

    setSending(true);
    sendStopTyping(selectedConversation.id);

    try {
      sendMessage(messageInput, currentUserId, selectedConversation.id);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageInput(messageInput); // Restore message input on error
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (selectedConversation) {
      sendTyping(selectedConversation.id);
    }
  };

  // Handle assign conversation
  const handleAssign = async (conversationId: string) => {
    if (!hasPermission('chat.reply')) {
      console.warn('[AdminChat] No permission to assign conversation');
      return;
    }
    if (!conversationId) {
      console.error('[AdminChat] No conversationId provided');
      return;
    }
    try {
      console.log(`[AdminChat] Assigning conversation ${conversationId} to current admin (${currentUserId})`);
      const updated = await assignConversation(conversationId);
      console.log(`[AdminChat] Assign successful, updated conversation:`, updated);
      
      // Ensure dates are strings (NestJS serialization should handle this, but just in case)
      const normalizedUpdated: Conversation = {
        ...updated,
        createdAt: typeof updated.createdAt === 'string' ? updated.createdAt : (updated.createdAt as any)?.toISOString?.() || updated.createdAt,
        updatedAt: typeof updated.updatedAt === 'string' ? updated.updatedAt : (updated.updatedAt as any)?.toISOString?.() || updated.updatedAt,
        messages: updated.messages?.map((msg: any) => ({
          ...msg,
          createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : (msg.createdAt as any)?.toISOString?.() || msg.createdAt,
        })) || [],
      };
      
      // Optimistically update UI immediately
      setConversations((prev) => {
        const updatedList = prev.map((conv) => 
          conv.id === conversationId ? { ...conv, ...normalizedUpdated } : conv
        );
        return updatedList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      
      // Update selected conversation if it's the one being assigned
      if (selectedConversation && selectedConversation.id === conversationId) {
        console.log(`[AdminChat] Updating selected conversation with assign info:`, normalizedUpdated);
        setSelectedConversation({ ...selectedConversation, ...normalizedUpdated });
      }
      
      // Real-time update will also come via conversation_updated event, but we update optimistically
      // Don't await loadConversations to avoid blocking UI
      loadConversations().catch(err => console.warn('[AdminChat] Failed to refresh conversations:', err));
    } catch (error: any) {
      console.error('[AdminChat] Failed to assign conversation:', error);
      console.error('[AdminChat] Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
      });
      // Could use toast: toast.error('Failed to assign conversation. Please try again.');
    }
  };

  // Handle unassign conversation
  const handleUnassign = async (conversationId: string) => {
    if (!hasPermission('chat.reply')) {
      console.warn('[AdminChat] No permission to unassign conversation');
      return;
    }
    if (!conversationId) {
      console.error('[AdminChat] No conversationId provided');
      return;
    }
    try {
      console.log(`[AdminChat] Unassigning conversation ${conversationId} from current admin (${currentUserId})`);
      const updated = await unassignConversation(conversationId);
      console.log(`[AdminChat] Unassign successful, updated conversation:`, updated);

      // Ensure dates are strings (NestJS serialization should handle this, but just in case)
      const normalizedUpdated: Conversation = {
        ...updated,
        createdAt: typeof updated.createdAt === 'string' ? updated.createdAt : (updated.createdAt as any)?.toISOString?.() || updated.createdAt,
        updatedAt: typeof updated.updatedAt === 'string' ? updated.updatedAt : (updated.updatedAt as any)?.toISOString?.() || updated.updatedAt,
        messages: updated.messages?.map((msg: any) => ({
          ...msg,
          createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : (msg.createdAt as any)?.toISOString?.() || msg.createdAt,
        })) || [],
      };

      // Optimistically update UI immediately
      setConversations((prev) => {
        const updatedList = prev.map((conv) =>
          conv.id === conversationId ? { ...conv, ...normalizedUpdated } : conv
        );
        return updatedList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      // Update selected conversation if it's the one being unassigned
      if (selectedConversation && selectedConversation.id === conversationId) {
        console.log(`[AdminChat] Updating selected conversation with unassign info:`, normalizedUpdated);
        setSelectedConversation({ ...selectedConversation, ...normalizedUpdated });
      }

      // Real-time update will also come via conversation_updated event, but we update optimistically
      // Don't await loadConversations to avoid blocking UI
      loadConversations().catch(err => console.warn('[AdminChat] Failed to refresh conversations:', err));
    } catch (error: any) {
      console.error('[AdminChat] Failed to unassign conversation:', error);
      console.error('[AdminChat] Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
      });
      // Could use toast: toast.error('Failed to unassign conversation. Please try again.');
    }
  };

  // Handle close conversation
  const handleClose = async (conversationId: string) => {
    if (!hasPermission('chat.reply')) return; // Check permission
    try {
      await closeConversation(conversationId);
      // Real-time update will come via conversation_updated event, but refresh as fallback
      await loadConversations();
      // If closing the currently selected conversation, update it
      if (selectedConversation && selectedConversation.id === conversationId) {
        setSelectedConversation({ ...selectedConversation, status: 'CLOSED' });
      }
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
  };

  // Calculate unread count - only count conversations with unread tenant messages
  useEffect(() => {
    const count = conversations.filter(conv =>
      conv.messages.some(msg => msg.senderRole === 'TENANT' && msg.status !== 'READ')
    ).length;
    setUnreadCount(count);
  }, [conversations]);

  // Calculate filter counts
  const filterCounts = {
    ALL: conversations.length,
    OPEN: conversations.filter(c => c.status === 'OPEN').length,
    PENDING: conversations.filter(c => c.status === 'PENDING').length,
    CLOSED: conversations.filter(c => c.status === 'CLOSED').length,
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (filterStatus === 'ALL') return true;
    return conv.status === filterStatus;
  });

  // Format timestamp
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.justNow;
    if (diffMins < 60) return `${diffMins}${t.minutesAgo}`;
    if (diffHours < 24) return `${diffHours}${t.hoursAgo}`;
    if (diffDays < 7) return `${diffDays}${t.daysAgo}`;
    return d.toLocaleDateString();
  };

  if (authLoading || pageLoading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  if (!user || !hasPermission('chat.read')) {
    return <NoAccess />;
  }

  const canReply = hasPermission('chat.reply');

  return (
    <div className={`flex h-full overflow-hidden ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Left Panel - Conversation List */}
      <div className={`w-1/3 border-r flex flex-col h-full overflow-hidden ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${
          darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.supportChat}</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filterStatus === 'ALL'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.all}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                filterStatus === 'ALL'
                  ? 'bg-blue-500/30 text-blue-100'
                  : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
              }`}>
                {filterCounts.ALL}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('OPEN')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filterStatus === 'OPEN'
                  ? 'bg-green-600 text-white shadow-lg'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.open}
              {filterCounts.OPEN > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  filterStatus === 'OPEN'
                    ? 'bg-green-500/30 text-green-100'
                    : 'bg-green-500/20 text-green-700 dark:text-green-400'
                }`}>
                  {filterCounts.OPEN}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filterStatus === 'PENDING'
                  ? 'bg-yellow-600 text-white shadow-lg'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.pending}
              {filterCounts.PENDING > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full animate-pulse ${
                  filterStatus === 'PENDING'
                    ? 'bg-yellow-500/30 text-yellow-100'
                    : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {filterCounts.PENDING}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterStatus('CLOSED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filterStatus === 'CLOSED'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.closed}
              {filterCounts.CLOSED > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  filterStatus === 'CLOSED'
                    ? 'bg-gray-500/30 text-gray-100'
                    : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                }`}>
                  {filterCounts.CLOSED}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {pageLoading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t.loading}</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t.noConversations}</div>
          ) : (
            filteredConversations.map((conv) => {
              const hasUnreadMessages = conv.messages.some(msg => msg.senderRole === 'TENANT' && msg.status !== 'READ');
              const isAssignedToMe = conv.adminId === currentUserId;
              const isPending = conv.status === 'PENDING';

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-4 border-b cursor-pointer transition-all duration-200 hover:shadow-md ${
                    darkMode
                      ? 'border-gray-700 hover:bg-gray-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  } ${
                    selectedConversation?.id === conv.id
                      ? darkMode
                        ? 'bg-blue-900/50 border-blue-600 shadow-lg'
                        : 'bg-blue-50 border-blue-300 shadow-md'
                      : ''
                  } ${hasUnreadMessages ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {conv.topic || t.untitledConversation}
                        </span>
                        {hasUnreadMessages && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        {isPending && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {conv.tenant.fullName}
                        {conv.tenant.email && ` • ${conv.tenant.email}`}
                      </div>
                      {conv.messages[0] && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {conv.messages[0].content}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap items-center">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        conv.status === 'OPEN'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : conv.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {conv.status}
                    </span>
                    {conv.adminId ? (
                      <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${
                        isAssignedToMe
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        {isAssignedToMe ? 'Me' : conv.admin?.fullName?.split(' ')[0] || 'Assigned'}
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 font-medium">
                        Unassigned
                      </span>
                    )}
                    {(conv.messages[0] as any)?.fileUrl?.startsWith('telegram:') && (
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium ${
                        darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                        </svg>
                        Telegram
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Message Thread */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className={`border-b p-6 flex-shrink-0 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="font-bold text-gray-900 dark:text-white text-xl mb-1">
                    {selectedConversation.topic || t.untitledConversation}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedConversation.tenant.fullName}
                    </p>
                    {selectedConversation.tenant.email && (
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        • {selectedConversation.tenant.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      selectedConversation.status === 'OPEN'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : selectedConversation.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {selectedConversation.status}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 items-center flex-wrap">
                {selectedConversation.adminId ? (
                  <>
                    <div className={`px-4 py-2 rounded text-sm font-medium ${
                      selectedConversation.adminId === currentUserId
                        ? darkMode ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-blue-100 text-blue-800 border border-blue-300'
                        : darkMode ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}>
                      {selectedConversation.adminId === currentUserId ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Assigned to Me
                        </span>
                      ) : (
                        <span>
                          Assigned to {selectedConversation.admin?.fullName || 'Admin'}
                        </span>
                      )}
                    </div>
                    {selectedConversation.adminId === currentUserId && canReply && (
                      <button
                        onClick={() => handleUnassign(selectedConversation.id)}
                        className={`px-4 py-2 text-white rounded text-sm transition-colors ${
                          darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        Unassign from Me
                      </button>
                    )}
                  </>
                ) : (
                  canReply && (
                    <button
                      onClick={() => handleAssign(selectedConversation.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      {t.assignToMe || 'Assign to Me'}
                    </button>
                  )
                )}
                {selectedConversation.status !== 'CLOSED' && canReply && (
                  <button
                    onClick={() => handleClose(selectedConversation.id)}
                    className={`px-4 py-2 text-white rounded text-sm transition-colors ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {t.closeChat}
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 min-h-0 ${
              darkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
              {messages.map((msg) => {
                const isAdmin = msg.senderRole === 'ADMIN';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                        isAdmin
                          ? 'bg-blue-600 text-white'
                          : darkMode 
                            ? 'bg-black text-white border-blue-600/30' 
                            : 'bg-white text-gray-900 border-gray-200'
                      }`}
                    >
                      {msg.fileUrl && !msg.fileUrl.startsWith('telegram:') && (
                        <div className="mb-2">
                          {(() => {
                            // Build correct file URL
                            let fileUrl: string;
                            if (msg.fileUrl.startsWith('http://') || msg.fileUrl.startsWith('https://')) {
                              // Full URL (e.g., from MinIO)
                              fileUrl = msg.fileUrl;
                            } else if (msg.fileUrl.startsWith('/uploads/')) {
                              // Relative path starting with /uploads/
                              const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                              fileUrl = `${apiBase}${msg.fileUrl}`;
                            } else {
                              // Other relative paths
                              const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                              fileUrl = `${apiBase}${msg.fileUrl.startsWith('/') ? '' : '/'}${msg.fileUrl}`;
                            }
                            
                            const fileName = msg.fileUrl.split('/').pop() || 'file';
                            const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                            
                            // Check if it's an image
                            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
                              return (
                                <img
                                  src={fileUrl}
                                  alt="Attachment"
                                  className="max-w-full rounded cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(fileUrl, '_blank')}
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              );
                            }
                            
                            // Check if it's a video
                            if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt)) {
                              return (
                                <video
                                  src={fileUrl}
                                  controls
                                  className="max-w-full rounded"
                                  preload="metadata"
                                >
                                  {t.browserNoVideoSupport}
                                  <a href={fileUrl} className="text-blue-500 underline">Download video</a>
                                </video>
                              );
                            }
                            
                            // Check if it's an audio/voice file
                            if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(fileExt)) {
                              return (
                                <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                  <svg className={`w-6 h-6 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                  </svg>
                                  <div className="flex-1">
                                    <p className={`text-xs mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {fileName}
                                    </p>
                                    <audio
                                      src={fileUrl}
                                      controls
                                      className="w-full"
                                      preload="metadata"
                                    >
                                      {t.browserNoAudioSupport}
                                    </audio>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Default: file download link
                            return (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 ${
                                  isAdmin ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                                }`}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span className="underline">{fileName}</span>
                              </a>
                            );
                          })()}
                        </div>
                      )}
                      {msg.content && (
                        <div className="break-words">{msg.content}</div>
                      )}
                      <div
                        className={`text-xs mt-1 flex items-center gap-1 ${
                          isAdmin ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {!isAdmin && msg.fileUrl?.startsWith('telegram:') && (
                          <span className={`ml-1 flex items-center gap-1 ${
                            darkMode ? 'text-purple-400' : 'text-purple-600'
                          }`} title="Sent via Telegram">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                            </svg>
                          </span>
                        )}
                        {isAdmin && (
                          <span className="ml-1">
                            {msg.status === 'READ' ? '✓✓' : msg.status === 'DELIVERED' ? '✓' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div className={`border-t p-6 flex-shrink-0 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={selectedConversation?.status === 'CLOSED' ? 'This conversation is closed' : 'Type your message...'}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      darkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-gray-50'
                    }`}
                    disabled={sending || !connected || !canReply || selectedConversation?.status === 'CLOSED'}
                  />
                  {typingUsers.size > 0 && (
                    <div className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
                      {Array.from(typingUsers).join(', ')} typing...
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending || !connected || !canReply || selectedConversation?.status === 'CLOSED'}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                    !messageInput.trim() || sending || !connected || !canReply || selectedConversation?.status === 'CLOSED'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95'
                  }`}
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.sending}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {t.send}
                    </>
                  )}
                </button>
              </div>
              {error && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t.error}: {error}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-4">{t.selectConversation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

