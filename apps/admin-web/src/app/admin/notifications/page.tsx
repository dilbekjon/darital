'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { NoAccess } from '../../../components/common/NoAccess';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { fetchApi, ApiError } from '../../../lib/api';

interface Tenant {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface SuccessMessage {
  type: 'test' | 'telegram';
  message: string;
  tenantName: string;
}

export default function AdminNotificationsPage() {
  const { user, loading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessMessage | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [notificationType, setNotificationType] = useState<'reminder' | 'overdue'>('reminder');
  const [telegramMessage, setTelegramMessage] = useState<string>('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user || !hasPermission('notifications.manage')) {
        setPageLoading(false);
        return;
      }
      const loadTenants = async () => {
        try {
          const data = await fetchApi<Tenant[]>('/tenants');
          setTenants(data);
          if (data.length > 0) {
            setSelectedTenantId(data[0].id);
            setSelectedTenant(data[0]);
          }
        } catch (err) {
          console.error('Failed to load tenants:', err);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError(t.unexpectedError);
          }
        } finally {
          setPageLoading(false);
        }
      };
      loadTenants();
    }
  }, [loading, user, hasPermission]);

  useEffect(() => {
    const tenant = tenants.find(t => t.id === selectedTenantId);
    setSelectedTenant(tenant || null);
  }, [selectedTenantId, tenants]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t.imageSizeLimit);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError(t.selectImageFile);
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSendTestNotification = async () => {
    if (!selectedTenantId || !notificationType || !hasPermission('notifications.manage')) return;
    setSendingTest(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('tenantId', selectedTenantId);
      formData.append('template', notificationType);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      // Don't set Content-Type for FormData, browser will set it with boundary
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new ApiError(errorData.message || 'Request failed', response.status, errorData);
      }
      
      const data = await response.json();
      
      setSuccess({
        type: 'test',
        message: data.message || t.testNotificationSent,
        tenantName: selectedTenant?.fullName || t.tenant,
      });
      
      // Clear image after successful send
      setSelectedImage(null);
      setImagePreview(null);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to send test notification:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendTelegramMessage = async () => {
    if (!selectedTenantId || !telegramMessage.trim() || !hasPermission('notifications.manage')) return;
    setSendingTelegram(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('tenantId', selectedTenantId);
      formData.append('message', telegramMessage);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      // Don't set Content-Type for FormData, browser will set it with boundary
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/notifications/telegram/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new ApiError(errorData.message || 'Request failed', response.status, errorData);
      }
      
      const data = await response.json();
      
      setSuccess({
        type: 'telegram',
        message: data.message || t.telegramMessageSent,
        tenantName: selectedTenant?.fullName || t.tenant,
      });
      
      setTelegramMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to send telegram message:', err);
      if (err instanceof ApiError) {
        setError(err.data?.message || err.message);
      } else {
        setError(t.unexpectedError);
      }
    } finally {
      setSendingTelegram(false);
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
      <div className={`max-w-7xl mx-auto pb-8`}>
        {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.dashboard || 'Dashboard', href: '/dashboard' },
          { label: t.notifications || 'Notifications' },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          {t.notificationsManagement || 'Notifications Management'}
        </h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t.sendTestNotifications || 'Send test notifications and custom messages to tenants via Email and Telegram'}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {success.message}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {t.sentTo || 'Sent to'}: {success.tenantName}
            </p>
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
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Notifications Card */}
        <div className={`bg-white dark:bg-black shadow-lg rounded-xl border overflow-hidden ${
          darkMode ? 'border-blue-600/30' : 'border-gray-200'
        }`}>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t.sendTestNotifications || 'Send Test Notifications'}
                </h2>
                <p className="text-sm text-blue-100">{t.email} + Telegram</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tenant Selection */}
          <div>
              <label htmlFor="tenantSelect" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t.selectTenant} <span className="text-red-500">*</span>
              </label>
            <select
              id="tenantSelect"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
                className={`w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
            >
              {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.fullName} {tenant.email ? `(${tenant.email})` : ''}
                  </option>
              ))}
            </select>
              
              {selectedTenant && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedTenant.fullName}</span>
                    {selectedTenant.email && (
                      <span className="text-gray-500 dark:text-gray-400">• {selectedTenant.email}</span>
                    )}
                  </div>
                </div>
              )}
          </div>

            {/* Notification Type */}
          <div>
              <label htmlFor="notificationType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t.notificationType} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNotificationType('reminder')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    notificationType === 'reminder'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : darkMode 
                        ? 'border-blue-600/30 bg-blue-600/10 text-white hover:border-blue-500'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{t.paymentReminder}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationType('overdue')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    notificationType === 'overdue'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : darkMode 
                        ? 'border-blue-600/30 bg-blue-600/10 text-white hover:border-blue-500'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">{t.overdueNotice}</span>
                  </div>
                </button>
          </div>
        </div>

            {/* Image Upload */}
            <div>
              <label htmlFor="imageUpload" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t.attachImage} <span className="text-gray-400 text-xs">({t.optional})</span>
              </label>
              {!selectedImage ? (
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  darkMode 
                    ? 'border-blue-600/30 bg-blue-600/5 hover:bg-blue-600/10' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">{t.clickToUpload}</span> {t.dragAndDrop}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.imageFormats}</p>
                  </div>
                  <input
                    id="imageUpload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </label>
              ) : (
                <div className="relative">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className={`w-full h-48 object-contain rounded-lg border ${
                        darkMode 
                          ? 'border-blue-600/30 bg-blue-600/5' 
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    />
                  )}
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {selectedImage && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Send Button */}
        <button 
          onClick={handleSendTestNotification} 
          disabled={!selectedTenantId || sendingTest} 
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {sendingTest ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t.sending || 'Sending...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{t.sendTestNotification}</span>
                </>
              )}
        </button>
      </div>
        </div>

        {/* Custom Telegram Message Card */}
        <div className={`bg-white dark:bg-black shadow-lg rounded-xl border overflow-hidden ${
          darkMode ? 'border-blue-600/30' : 'border-gray-200'
        }`}>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t.sendCustomTelegram || 'Send Custom Telegram Message'}
                </h2>
                <p className="text-sm text-purple-100">{t.message} {t.to.toLowerCase()} {t.tenant.toLowerCase()}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tenant Selection */}
          <div>
              <label htmlFor="tenantSelectTelegram" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t.selectTenant} <span className="text-red-500">*</span>
              </label>
            <select
              id="tenantSelectTelegram"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
                className={`w-full rounded-lg border-gray-300 shadow-sm px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                  darkMode ? 'bg-black border-blue-600/30 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
            >
              {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.fullName} {tenant.email ? `(${tenant.email})` : ''}
                  </option>
              ))}
            </select>
          </div>

            {/* Message Input */}
          <div>
              <label htmlFor="telegramMessage" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t.message} <span className="text-red-500">*</span>
              </label>
            <textarea
              id="telegramMessage"
              value={telegramMessage}
              onChange={(e) => setTelegramMessage(e.target.value)}
                rows={6}
                placeholder={t.enterTelegramMessage}
                className="w-full rounded-lg border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
              />
              <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>{t.supportsHtmlFormatting}</span>
                <span>{telegramMessage.length} {t.characters}</span>
          </div>
        </div>

            {/* Image Upload */}
            <div>
              <label htmlFor="imageUploadTelegram" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t.attachImage} <span className="text-gray-400 text-xs">({t.optional})</span>
              </label>
              {!selectedImage ? (
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  darkMode 
                    ? 'border-blue-600/30 bg-blue-600/5 hover:bg-blue-600/10' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">{t.clickToUpload}</span> {t.dragAndDrop}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.imageFormats}</p>
                  </div>
                  <input
                    id="imageUploadTelegram"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </label>
              ) : (
                <div className="relative">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className={`w-full h-48 object-contain rounded-lg border ${
                        darkMode 
                          ? 'border-blue-600/30 bg-blue-600/5' 
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    />
                  )}
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {selectedImage && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Send Button */}
        <button 
          onClick={handleSendTelegramMessage} 
          disabled={!selectedTenantId || !telegramMessage.trim() || sendingTelegram} 
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {sendingTelegram ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t.sending || 'Sending...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{t.sendTelegramMessage}</span>
                </>
              )}
        </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              {t.howItWorks}
            </h3>
            <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li className="flex items-start gap-2">
                <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} mt-1`}>•</span>
                <span><strong>{t.paymentReminder}:</strong> {t.testNotificationsDesc}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} mt-1`}>•</span>
                <span><strong>{t.sendCustomTelegram}:</strong> {t.customTelegramDesc}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} mt-1`}>•</span>
                <span>{t.notificationsRespectPreferences}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
