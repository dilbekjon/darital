import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getNotificationsFeed } from '../api/client';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';

interface NotificationItem {
  id: string;
  tenantId: string;
  invoiceId?: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Hozirgina';
  if (diffMins < 60) return `${diffMins} daqiqa oldin`;
  if (diffHours < 24) return `${diffHours} soat oldin`;
  if (diffDays === 1) return 'Kecha';
  if (diffDays < 7) return `${diffDays} kun oldin`;
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getNotificationStyle(type: string): { icon: string; color: string; bg: string } {
  const lower = (type || '').toLowerCase();
  if (lower.includes('payment') || lower.includes('to\'lov') || lower.includes('invoice')) {
    return { icon: '💳', color: '#059669', bg: '#D1FAE5' };
  }
  if (lower.includes('remind') || lower.includes('eslatma')) {
    return { icon: '⏰', color: '#D97706', bg: '#FEF3C7' };
  }
  if (lower.includes('alert') || lower.includes('xavotir')) {
    return { icon: '⚠️', color: '#DC2626', bg: '#FEE2E2' };
  }
  return { icon: '📬', color: '#3B82F6', bg: '#DBEAFE' };
}

export default function NotificationsScreen() {
  const { darkMode } = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotificationsFeed();
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Xabarnomalar yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const style = getNotificationStyle(item.type);
    const isDark = darkMode;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderLeftColor: style.color,
            borderColor: isDark ? '#374151' : '#E5E7EB',
            shadowColor: isDark ? '#000' : '#000',
            shadowOpacity: isDark ? 0.3 : 0.08,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: isDark ? style.color + '30' : style.bg }]}>
          <Text style={styles.cardIcon}>{style.icon}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text
            style={[styles.cardTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.cardBodyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
            numberOfLines={3}
          >
            {item.body}
          </Text>
          <Text style={[styles.cardTime, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={[styles.emptyWrap, { paddingVertical: 80 }]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: darkMode ? '#374151' : '#E5E7EB' }]}>
        <Text style={styles.emptyEmoji}>🔔</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: darkMode ? '#F9FAFB' : '#111827' }]}>
        {t.noNotifications}
      </Text>
      <Text style={[styles.emptySub, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
        To'lov eslatmalari va boshqa xabarlar shu yerda ko'rinadi
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorWrap}>
      <View style={[styles.errorIconWrap, { backgroundColor: darkMode ? '#7F1D1D' : '#FEE2E2' }]}>
        <Text style={styles.errorEmoji}>⚠️</Text>
      </View>
      <Text style={[styles.errorTitle, { color: darkMode ? '#FCA5A5' : '#DC2626' }]}>{error}</Text>
      <Text style={[styles.errorSub, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
        Pastga torting yoki qayta urinib ko'ring
      </Text>
      <TouchableOpacity
        onPress={load}
        style={[styles.retryBtn, { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' }]}
      >
        <Text style={styles.retryBtnText}>{t.retry}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && items.length === 0) {
    return <DaritalLoader fullScreen darkMode={darkMode} />;
  }

  if (error && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: darkMode ? '#000000' : '#F0F9FF' }]}>
        <Navbar />
        {renderError()}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: darkMode ? '#000000' : '#F0F9FF' }]}>
      <Navbar />
      <View style={[styles.header, { borderBottomColor: darkMode ? '#374151' : '#E5E7EB' }]}>
        <Text style={[styles.headerTitle, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>
          {t.yourNotifications}
        </Text>
        {items.length > 0 && (
          <Text style={[styles.headerSub, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {items.length} xabar
          </Text>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={darkMode ? '#FBBF24' : '#3B82F6'}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBodyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
