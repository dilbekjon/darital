'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUntypedTranslations } from '../../../i18n/useUntypedTranslations';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { EmptyState } from '../../../components/EmptyState';
import { fetchApi, ApiError } from '../../../lib/api';
import {
  getTelegramUsers,
  sendTelegramMessage,
  sendTelegramBroadcast,
  getTelegramBotInfo,
  TelegramUser,
  BotInfoResponse,
} from '../../../lib/telegramApi';

export default function AdminTelegramPage() {
  const { user, loading, hasPermission } = useAuth();
  const t = useUntypedTranslations();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [telegramUsers, setTelegramUsers] = useState<TelegramUser[]>([]);
  const [botInfo, setBotInfo] = useState<BotInfoResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [message, setMessage] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'chat' | 'broadcast'>('chat');

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('notifications.manage')) {
        setPageLoading(false);
        return;
      }

      const loadData = async () => {
        try {
          const [usersData, botInfoData] = await Promise.all([
            getTelegramUsers(),
            getTelegramBotInfo(),
          ]);
          setTelegramUsers(usersData.users);
          setBotInfo(botInfoData);
        } catch (err) {
          console.error('Failed to load Telegram data:', err);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred.');
          }
        } finally {
          setPageLoading(false);
        }
      };

      loadData();
    }
  }, [loading, user, hasPermission]);

  const filteredUsers = useMemo(() => {
    let filtered = telegramUsers;

    // Filter by role
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.tenant?.fullName?.toLowerCase().includes(query) ||
          u.tenant?.email?.toLowerCase().includes(query) ||
          u.chatId.includes(query)
      );
    }

    return filtered;
  }, [telegramUsers, searchQuery, roleFilter]);

  const handleSendMessage = async () => {
    if (!selectedUser) {
      setError('Please select a user to send message to');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setError(null);
    setSending(true);

    try {
      const chatId = selectedUser.chatId;
      await sendTelegramMessage(undefined, chatId, message);
      setSuccess(`Message sent to ${selectedUser.tenant?.fullName || 'user'} successfully!`);
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setError('Please enter a message to broadcast');
      return;
    }

    if (!confirm(`Are you sure you want to send this message to ${filteredUsers.length} user(s)?`)) {
      return;
    }

    setError(null);
    setSendingBroadcast(true);

    try {
      const role = roleFilter !== 'ALL' ? roleFilter : undefined;
      const result = await sendTelegramBroadcast(broadcastMessage, role);
      setSuccess(`Broadcast sent successfully! Sent to ${result.sent} user(s), ${result.failed} failed.`);
      setBroadcastMessage('');
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError('Failed to send broadcast. Please try again.');
      }
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading || pageLoading) {
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

  if (!user || !hasPermission('notifications.manage')) {
    return <NoAccess />;
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 h-full overflow-y-auto ${
      darkMode ? 'bg-black' : 'bg-gray-100'
    }`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Bosh sahifa', href: '/dashboard' },
          { label: 'Telegram Chat' },
        ]}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
            <svg className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Telegram Chat
          </h1>
        </div>
        {botInfo && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Bot Status:
            </span>
            {botInfo.enabled && botInfo.bot ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                @{botInfo.bot.username} - Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Offline
              </span>
            )}
          </div>
        )}
        <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Send messages to tenants via Telegram bot
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-blue-600/30">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'chat'
              ? darkMode
                ? 'text-blue-400 border-blue-400'
                : 'text-blue-600 border-blue-600'
              : darkMode
              ? 'text-gray-400 border-transparent hover:text-gray-300'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          Send to User
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'broadcast'
              ? darkMode
                ? 'text-blue-400 border-blue-400'
                : 'text-blue-600 border-blue-600'
              : darkMode
              ? 'text-gray-400 border-transparent hover:text-gray-300'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          Broadcast ({filteredUsers.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className={`lg:col-span-1 ${darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'} border rounded-lg shadow-md overflow-hidden`}>
          <div className={`p-4 border-b ${darkMode ? 'border-blue-600/30 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Telegram Users ({telegramUsers.length})
            </h2>

            {/* Filters */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder={t.searchByNameEmail || 'Ism, email bo\'yicha qidirish...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  darkMode
                    ? 'bg-black border-blue-600/30 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  darkMode
                    ? 'bg-gray-900 border-blue-600/30 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="ALL">All Roles</option>
                <option value="TENANT">Tenants</option>
                <option value="ADMIN">Admins</option>
                <option value="SUPER_ADMIN">Super Admins</option>
              </select>
            </div>
          </div>

          {/* Users List */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No Telegram users found
                </p>
              </div>
            ) : (
              filteredUsers.map((telegramUser) => (
                <button
                  key={telegramUser.chatId}
                  onClick={() => setSelectedUser(telegramUser)}
                  className={`w-full p-3 text-left border-b transition-colors ${
                    darkMode ? 'border-blue-600/20 hover:bg-blue-600/10' : 'border-gray-200 hover:bg-gray-50'
                  } ${
                    selectedUser?.chatId === telegramUser.chatId
                      ? darkMode ? 'bg-blue-600/20' : 'bg-blue-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`p-2 rounded-full ${
                      darkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {telegramUser.tenant?.fullName || 'Unknown User'}
                      </p>
                      <p className={`text-xs truncate ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {telegramUser.tenant?.email || (t.noEmail || 'Email yo\'q')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          telegramUser.role === 'TENANT'
                            ? darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                            : darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {telegramUser.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`lg:col-span-2 ${darkMode ? 'bg-black border-blue-600/30' : 'bg-white border-gray-200'} border rounded-lg shadow-md overflow-hidden flex flex-col`}>
          {activeTab === 'chat' ? (
            <>
              {/* Chat Header */}
              {selectedUser ? (
                <div className={`p-4 border-b ${darkMode ? 'border-blue-600/30 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
                      <svg className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedUser.tenant?.fullName || 'Unknown User'}
                      </h3>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {selectedUser.tenant?.email || (t.noEmail || 'Email yo\'q')} • Chat ID: {selectedUser.chatId}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-8 text-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <svg className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select a user from the list to send a message
                  </p>
                </div>
              )}

              {/* Message Input */}
              {selectedUser && (
                <div className="p-4 space-y-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t.typeMessageHere || 'Xabaringizni shu yerga yozing... (HTML qo\'llab-quvvatlanadi)'}
                      rows={8}
                      className={`w-full px-4 py-3 border rounded-lg resize-none ${
                        darkMode
                          ? 'bg-black border-blue-600/30 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      💡 Tip: You can use HTML tags like &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;code&gt;code&lt;/code&gt;
                    </p>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                      sending || !message.trim()
                        ? darkMode
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : darkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                    }`}
                  >
                    {sending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Broadcast Panel */}
              <div className={`p-4 border-b ${darkMode ? 'border-blue-600/30 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Broadcast Message
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Send message to {roleFilter === 'ALL' ? 'all' : roleFilter.toLowerCase()} users ({filteredUsers.length})
                </p>
              </div>

              <div className="p-4 space-y-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Message
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type your broadcast message here... (Supports HTML formatting)"
                    rows={10}
                    className={`w-full px-4 py-3 border rounded-lg resize-none ${
                      darkMode
                        ? 'bg-black border-blue-600/30 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    💡 Tip: You can use HTML tags like &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;code&gt;code&lt;/code&gt;
                  </p>
                </div>

                <button
                  onClick={handleSendBroadcast}
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                    sendingBroadcast || !broadcastMessage.trim()
                      ? darkMode
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : darkMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/30'
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                  }`}
                >
                  {sendingBroadcast ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Broadcasting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Send Broadcast to {filteredUsers.length} User(s)
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
