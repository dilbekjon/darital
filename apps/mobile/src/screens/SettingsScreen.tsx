import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreference } from '../api/tenantApi';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';

const CHANNEL_INFO: Record<string, { label: string; icon: string }> = {
  EMAIL: { label: 'Email', icon: '📧' },
  PUSH: { label: 'Push', icon: '📱' },
  TELEGRAM: { label: 'Telegram', icon: '💬' },
  SMS: { label: 'SMS', icon: '📱' },
};

interface SettingsScreenProps {
  navigation?: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      setError(null);
      const data = await getNotificationPreferences();
      const allChannels = ['EMAIL', 'PUSH', 'TELEGRAM', 'SMS'];
      const prefs = allChannels.map((ch) => {
        const existing = data.preferences?.find((p) => p.channel === ch);
        return existing || { channel: ch, enabled: true };
      });
      setPreferences(prefs);
    } catch (e: any) {
      setError(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (channel: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.channel === channel ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(preferences);
      Alert.alert('', t.preferencesSaved || 'Preferences saved');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || saving) {
    return <DaritalLoader fullScreen darkMode={darkMode} />;
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: darkMode ? '#000' : '#F0F9FF' }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.error, { color: darkMode ? '#FCA5A5' : '#EF4444' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000' : '#F0F9FF' }]}>
      <Navbar />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>
          ⚙️ {t.settings || 'Settings'}
        </Text>
        <View style={[styles.card, { backgroundColor: darkMode ? '#1F2937' : '#FFF', borderColor: darkMode ? '#374151' : '#E5E7EB' }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? '#FFF' : '#1F2937' }]}>
            🔔 {t.notificationPreferences || 'Notifications'}
          </Text>
          {preferences.map((pref) => {
            const info = CHANNEL_INFO[pref.channel] || { label: pref.channel, icon: '📢' };
            return (
              <View key={pref.channel} style={[styles.row, { borderBottomColor: darkMode ? '#374151' : '#E5E7EB' }]}>
                <Text style={styles.rowIcon}>{info.icon}</Text>
                <Text style={[styles.rowLabel, { color: darkMode ? '#FFF' : '#1F2937' }]}>{info.label}</Text>
                <Switch
                  value={pref.enabled}
                  onValueChange={() => toggle(pref.channel)}
                  trackColor={{ false: darkMode ? '#374151' : '#D1D5DB', true: '#10B981' }}
                  thumbColor="#FFF"
                />
              </View>
            );
          })}
          <TouchableOpacity
            onPress={save}
            style={[styles.saveBtn, { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' }]}
          >
            <Text style={styles.saveBtnText}>{t.saveChanges || 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  error: { fontSize: 16, textAlign: 'center', fontWeight: '600' },
  card: { borderRadius: 16, padding: 16, borderWidth: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rowIcon: { fontSize: 24, marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16 },
  saveBtn: { marginTop: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
