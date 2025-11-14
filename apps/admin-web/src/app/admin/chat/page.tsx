'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatSocket } from '../../../hooks/useChatSocket';
import {
  getConversations,
  getMessages,
  assignConversation,
  closeConversation,
  type Conversation,
  type Message,
} from '../../../lib/chatApi';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';

export default function AdminChatPage() {
  const { t } = useLanguage();
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

  // Check permissions and load data
  useEffect(() => {
    if (!authLoading) {
      if (!user || !hasPermission('chat.read')) {
        setPageLoading(false);
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
            return { ...conv, updatedAt: message.createdAt, messages: [{ id: message.id, content: message.content || '', createdAt: message.createdAt, status: message.status }] };
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
      if (data.length > 0 && !selectedConversation) {
        handleSelectConversation(data[0]);
      }
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
    if (!hasPermission('chat.reply')) return; // Check permission
    try {
      await assignConversation(conversationId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to assign conversation:', error);
    }
  };

  // Handle close conversation
  const handleClose = async (conversationId: string) => {
    if (!hasPermission('chat.reply')) return; // Check permission
    try {
      await closeConversation(conversationId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
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
    return (
      <div className={`flex flex-1 items-center justify-center min-h-screen ${
        darkMode ? 'bg-black' : 'bg-gray-100'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
          darkMode ? 'border-blue-500' : 'border-blue-500'
        }`}></div>
      </div>
    );
  }

  if (!user || !hasPermission('chat.read')) {
    return <NoAccess />;
  }

  const canReply = hasPermission('chat.reply');

  return (
    <div className={`flex h-screen ${
      darkMode ? 'bg-black' : 'bg-gray-100'
    }`}>
      {/* Left Panel - Conversation List */}
      <div className={`w-1/3 border-r flex flex-col ${
        darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${
          darkMode ? 'border-blue-600/30' : 'border-gray-200'
        }`}>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t.supportChat}</h1>
          
          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {connected ? t.connected : t.connecting}
            </span>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterStatus === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : darkMode 
                    ? 'bg-blue-600/10 text-white hover:bg-blue-600/20' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.all}
            </button>
            <button
              onClick={() => setFilterStatus('OPEN')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterStatus === 'OPEN'
                  ? 'bg-blue-600 text-white'
                  : darkMode 
                    ? 'bg-blue-600/10 text-white hover:bg-blue-600/20' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.open}
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterStatus === 'PENDING'
                  ? 'bg-blue-600 text-white'
                  : darkMode 
                    ? 'bg-blue-600/10 text-white hover:bg-blue-600/20' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.pending}
            </button>
            <button
              onClick={() => setFilterStatus('CLOSED')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterStatus === 'CLOSED'
                  ? 'bg-blue-600 text-white'
                  : darkMode 
                    ? 'bg-blue-600/10 text-white hover:bg-blue-600/20' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.closed}
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
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  darkMode 
                    ? 'border-blue-600/20 hover:bg-blue-600/10' 
                    : 'border-gray-100 hover:bg-gray-50'
                } ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {conv.topic || t.untitledConversation}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(conv.updatedAt)}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {conv.tenant.fullName}
                  {conv.tenant.email && ` • ${conv.tenant.email}`}
                </div>

                {conv.messages[0] && (
                  <div className="text-sm text-gray-600 truncate">
                    {conv.messages[0].content}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      conv.status === 'OPEN'
                        ? 'bg-green-100 text-green-800'
                        : conv.status === 'PENDING'
                        ? darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {conv.status}
                  </span>
                  {conv.adminId && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                      Assigned
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className={`border-b p-4 ${
              darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                    {selectedConversation.topic || t.untitledConversation}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedConversation.tenant.fullName}
                    {selectedConversation.tenant.email && ` • ${selectedConversation.tenant.email}`}
                  </p>
                </div>
                
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    selectedConversation.status === 'OPEN'
                      ? 'bg-green-100 text-green-800'
                      : selectedConversation.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selectedConversation.status}
                </span>
              </div>
              
              <div className="flex gap-2">
                {!selectedConversation.adminId && canReply && (
                  <button
                    onClick={() => handleAssign(selectedConversation.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    {t.assignToMe}
                  </button>
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
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              darkMode ? 'bg-black' : 'bg-gray-50'
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
                      {msg.fileUrl && (
                        <div className="mb-2">
                          {msg.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${msg.fileUrl}`}
                              alt="Attachment"
                              className="max-w-full rounded"
                            />
                          ) : (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${msg.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 ${
                                isAdmin ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="underline">View File</span>
                            </a>
                          )}
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
              
              {typingUsers.size > 0 && (
                <div className="text-sm text-gray-500 italic">
                  {Array.from(typingUsers).join(', ')} typing...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div className={`border-t p-4 ${
              darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'
            }`}>
              <div className="flex gap-2">
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
                  placeholder={t.typeMessage}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'border-blue-600/30 bg-black text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  disabled={sending || !connected || !canReply} // Disable if no chat.reply permission
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending || !connected || !canReply} // Disable if no chat.reply permission
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? t.sending : t.send}
                </button>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">{t.error}: {error}</div>
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

