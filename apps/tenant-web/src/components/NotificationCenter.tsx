'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchTenantApi } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

const NotificationCenter: React.FC = () => {
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await fetchTenantApi<{ count: number }>('/tenant/notifications/in-app/unread-count');
        setUnreadCount(data.count);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchTenantApi<Notification[]>('/tenant/notifications/in-app?limit=20');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchTenantApi(`/tenant/notifications/in-app/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchTenantApi('/tenant/notifications/in-app/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetchTenantApi(`/tenant/notifications/in-app/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_DUE':
        return '💰';
      case 'PAYMENT_CONFIRMED':
        return '✅';
      case 'CONTRACT_EXPIRING':
        return '📄';
      case 'MESSAGE':
        return '💬';
      default:
        return '🔔';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.justNow || 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
        }`}
      >
        <svg
          className={`w-6 h-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🔔 {t.notifications || 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={`text-sm font-medium ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {t.markAllRead || 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-4xl mb-2">🔕</p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {t.noNotifications || 'No notifications'}
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b transition-colors ${
                      darkMode ? 'border-gray-800' : 'border-gray-100'
                    } ${
                      !notification.read
                        ? darkMode
                          ? 'bg-blue-500/10'
                          : 'bg-blue-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`font-medium truncate ${
                              darkMode ? 'text-white' : 'text-gray-800'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span
                            className={`text-xs flex-shrink-0 ${
                              darkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        <p
                          className={`text-sm mt-1 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className={`text-xs font-medium ${
                                darkMode
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-blue-600 hover:text-blue-700'
                              }`}
                            >
                              {t.markRead || 'Mark read'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className={`text-xs font-medium ${
                              darkMode
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-red-600 hover:text-red-700'
                            }`}
                          >
                            {t.delete || 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className={`px-4 py-2 text-center border-t ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <button
                onClick={fetchNotifications}
                className={`text-sm font-medium ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {t.refresh || 'Refresh'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
