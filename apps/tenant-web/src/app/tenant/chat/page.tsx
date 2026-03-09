'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatSocket } from '../../../hooks/useChatSocket';
import {
  getConversations,
  getMessages,
  createConversation,
  type Conversation,
  type Message,
} from '../../../lib/chatApi';
import { StartChatModal } from '../../../components/StartChatModal';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import TenantNavbar from '../../../components/TenantNavbar';

export default function TenantChatPage() {
  const t = useUntypedTranslations();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Initialize socket
  const { connected, error, sendMessage, markAsRead } = useChatSocket({
    conversationId: selectedConversation?.id,
    onMessageReceived: (message) => {
      // Add new message to list (avoid duplicates)
      setMessages((prev) => {
        // Check if message already exists
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      
      // Update conversation list (move to top, update last message)
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              updatedAt: message.createdAt,
              messages: [
                {
                  id: message.id,
                  content: message.content || '',
                  createdAt: message.createdAt,
                  status: message.status,
                  senderRole: message.senderRole, // Include required senderRole
                },
              ],
            };
          }
          return conv;
        });
        // Sort by updatedAt
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      // Mark as read if conversation is open
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        markAsRead(message.conversationId);
      }
    },
    onMessagesRead: (data) => {
      // Update message statuses
      setMessages((prev) =>
        prev.map((msg) =>
          msg.conversationId === data.conversationId && msg.status !== 'READ'
            ? { ...msg, status: 'READ' as const }
            : msg
        )
      );
    },
  });

  // Get current user ID from token
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Decode JWT to get user ID
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.sub || payload.id);
    } catch (error) {
      console.error('Failed to decode token:', error);
      router.push('/login');
    }
  }, [router]);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
      
      // Auto-select first conversation
      if (data.length > 0 && !selectedConversation) {
        handleSelectConversation(data[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    try {
      const data = await getMessages(conversation.id);
      setMessages(data);
      
      // Mark as read
      markAsRead(conversation.id);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Open modal to start new chat
  const handleStartNewChatClick = () => {
    setModalOpen(true);
  };

  // Create new conversation with topic
  const handleStartNewChat = async (topic: string) => {
    try {
      setCreatingConversation(true);
      const newConv = await createConversation(topic, 'Hello, I need help');
      
      // Check if conversation already exists in the list (backend might return existing one)
      setConversations((prevConversations) => {
        const existingIndex = prevConversations.findIndex(c => c.id === newConv.id);
        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prevConversations];
          updated[existingIndex] = newConv;
          return updated;
        }
        // Add new conversation at the beginning
        return [newConv, ...prevConversations];
      });
      
      handleSelectConversation(newConv);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      const msg = error instanceof Error ? error.message : 'Failed to start conversation. Please try again.';
      alert(msg);
    } finally {
      setCreatingConversation(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !currentUserId || sending) return;

    // Check if conversation is closed - tenants cannot send messages to closed conversations
    if (selectedConversation.status === 'CLOSED') {
      alert('This conversation is closed. You cannot send messages to closed conversations.');
      return;
    }

    setSending(true);
    const content = messageInput.trim();
    setMessageInput('');

    try {
      sendMessage(content, currentUserId, selectedConversation.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message input on error
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

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
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const showListOnMobile = !selectedConversation;
  const showChatOnMobile = !!selectedConversation;

  return (
    <>
      <TenantNavbar />
      <div className="flex flex-col lg:flex-row h-[100dvh] lg:h-screen bg-gray-100 dark:bg-gray-900">
      {/* Left Panel - Conversation List (hidden on mobile/tablet when chat is open) */}
      <div className={`${showListOnMobile ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 xl:w-96 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0`}>
        <div className="p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center gap-2 mb-3">
            <h1 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-white truncate">💬 {t.supportChat}</h1>
            <a
              href="/tenant"
              className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← {t.home}
            </a>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {connected ? t.connected : t.connecting}
            </span>
          </div>

          <button
            onClick={handleStartNewChatClick}
            disabled={creatingConversation}
            className="w-full min-h-[48px] px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium text-base touch-manipulation"
          >
            {creatingConversation ? t.creating : t.startNewChat}
          </button>
        </div>

        <StartChatModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleStartNewChat}
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t.loading}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p className="mb-2 text-base">{t.noConversations}</p>
              <p className="text-sm text-gray-400">{t.welcomeToChat}</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`p-4 min-h-[60px] border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors touch-manipulation ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {conv.topic || t.supportChat}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(conv.updatedAt)}
                  </span>
                </div>

                {conv.admin && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {conv.admin.fullName}
                  </div>
                )}

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
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {conv.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Message Thread (hidden on mobile/tablet when no chat selected) */}
      <div className={`${showChatOnMobile ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0`}>
        {selectedConversation ? (
          <>
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 lg:p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  aria-label={t.home}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 dark:text-white text-base lg:text-lg truncate">
                    {selectedConversation.topic || t.supportChat}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {selectedConversation.admin 
                      ? selectedConversation.admin.fullName
                      : t.supportTeam}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                    selectedConversation.status === 'OPEN'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : selectedConversation.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {selectedConversation.status}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg) => {
                const isTenant = msg.senderRole === 'TENANT';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                        isTenant
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
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
                                isTenant ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
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
                          isTenant ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {isTenant && (
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
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 lg:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {error && (
                <div className="mb-2 text-sm text-red-600 dark:text-red-400">{t.error}: {error}</div>
              )}
              {selectedConversation.status === 'CLOSED' && (
                <div className="mb-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                  This conversation is closed. You cannot send messages to closed conversations.
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={selectedConversation.status === 'CLOSED' ? 'Conversation is closed' : t.typeMessage}
                  className="flex-1 min-h-[48px] px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  disabled={sending || !connected || selectedConversation.status === 'CLOSED'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending || !connected || selectedConversation.status === 'CLOSED'}
                  className="min-h-[48px] px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium touch-manipulation"
                >
                  {sending ? t.sending : t.send}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center px-4">
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
              <p className="mt-4 text-lg font-medium">{t.welcomeToChat}</p>
              <p className="mt-2 text-sm">{t.selectConversation}</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}

