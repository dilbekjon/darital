'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import TenantNavbar from '../../../components/TenantNavbar';
import Breadcrumbs from '../../../components/Breadcrumbs';
import DaritalLoader from '../../../components/DaritalLoader';
import { fetchTenantApi, ApiError } from '../../../lib/api';

interface NotificationPreference {
  channel: string;
  enabled: boolean;
}

const channelInfo: Record<string, { label: string; icon: string; description: string }> = {
  EMAIL: {
    label: 'Email',
    icon: '📧',
    description: 'Receive notifications via email',
  },
  PUSH: {
    label: 'Push Notifications',
    icon: '📱',
    description: 'Mobile app push notifications',
  },
  TELEGRAM: {
    label: 'Telegram',
    icon: '💬',
    description: 'Receive updates via Telegram bot',
  },
  SMS: {
    label: 'SMS',
    icon: '📱',
    description: 'Receive text message alerts',
  },
};

const SettingsPage = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const data = await fetchTenantApi<{ preferences: NotificationPreference[] }>(
          '/tenant/notifications/preferences'
        );
        
        // Ensure all channels are present
        const allChannels = ['EMAIL', 'PUSH', 'TELEGRAM', 'SMS'];
        const prefs = allChannels.map((channel) => {
          const existing = data.preferences?.find((p) => p.channel === channel);
          return existing || { channel, enabled: true };
        });
        
        setPreferences(prefs);
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, [router]);

  const togglePreference = (channel: string) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.channel === channel ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await fetchTenantApi('/tenant/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ preferences }),
      });
      alert(t.preferencesSaved || 'Preferences saved successfully!');
    } catch (err) {
      console.error(err);
      alert(t.saveError || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DaritalLoader darkMode={darkMode} />;
  }

  return (
    <>
      <TenantNavbar />
      <div
        className={`min-h-screen transition-colors duration-500 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900'
            : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: t.settings || 'Settings' }]} />

          {/* Header */}
          <div className="mb-8">
            <h1
              className={`text-3xl font-bold mb-2 ${
                darkMode
                  ? 'text-white'
                  : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
              }`}
            >
              ⚙️ {t.settings || 'Settings'}
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {t.managePreferences || 'Manage your notification preferences and account settings'}
            </p>
          </div>

          {/* Notification Preferences */}
          <div
            className={`rounded-2xl border p-6 mb-6 ${
              darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
            }`}
          >
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🔔 {t.notificationPreferences || 'Notification Preferences'}
            </h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.chooseChannels || 'Choose how you want to receive notifications'}
            </p>

            <div className="space-y-4">
              {preferences.map((pref) => {
                const info = channelInfo[pref.channel];
                return (
                  <div
                    key={pref.channel}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      darkMode
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{info?.icon || '📢'}</span>
                      <div>
                        <p
                          className={`font-medium ${
                            darkMode ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {info?.label || pref.channel}
                        </p>
                        <p
                          className={`text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {info?.description || ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePreference(pref.channel)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        pref.enabled
                          ? 'bg-green-500'
                          : darkMode
                          ? 'bg-gray-700'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                          pref.enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={savePreferences}
              disabled={saving}
              className={`w-full mt-6 py-3 px-4 rounded-xl font-bold transition-all ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t.saving || 'Saving...'}
                </span>
              ) : (
                t.saveChanges || 'Save Changes'
              )}
            </button>
          </div>

          {/* Quick Links */}
          <div
            className={`rounded-2xl border p-6 ${
              darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
            }`}
          >
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🔗 {t.quickLinks || 'Quick Links'}
            </h2>
            <div className="grid gap-3">
              <a
                href="/tenant/documents"
                className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  darkMode
                    ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/10'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span className="text-2xl">📁</span>
                <span className={darkMode ? 'text-white' : 'text-gray-800'}>
                  {t.myDocuments || 'My Documents'}
                </span>
              </a>
              <a
                href="/tenant/chat"
                className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  darkMode
                    ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/10'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span className="text-2xl">💬</span>
                <span className={darkMode ? 'text-white' : 'text-gray-800'}>
                  {t.support || 'Contact Support'}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
