import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../api/client';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';

const PAYMENTS_CACHE_KEY = 'paymentsCache';

interface PaymentsScreenProps {
  navigation: any;
}

export default function PaymentsScreen({ navigation }: PaymentsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const loadPayments = async () => {
    try {
      setError(null);
      setIsOffline(false);
      
      // Try to fetch from API
      const result = await apiGet('/tenant/payments');
      
      // Handle paginated response: { data, meta } or legacy array format
      let paymentList: any[];
      let meta: { page: number; limit: number; total: number } | null = null;
      
      if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        // New paginated format
        paymentList = result.data;
        meta = result.meta || null;
        setPaginationMeta(meta);
      } else if (Array.isArray(result)) {
        // Legacy array format (backward compatibility)
        paymentList = result;
        setPaginationMeta(null);
      } else {
        throw new Error('Invalid response format from API');
      }
      
      setPayments(paymentList);
      
      // Cache the result (store as array for backward compatibility)
      await AsyncStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(paymentList));
      console.log('✅ Payments cached successfully', meta ? `(${paymentList.length} of ${meta.total})` : '');
    } catch (e: any) {
      console.log('⚠️ API error, attempting to load from cache:', e.message);
      
      // Fallback to cached data
      try {
        const cachedData = await AsyncStorage.getItem(PAYMENTS_CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Cached data is always an array (for backward compatibility)
          setPayments(Array.isArray(parsed) ? parsed : []);
          setPaginationMeta(null); // No pagination info in cache
          setIsOffline(true);
          console.log('✅ Loaded from cache (offline mode)');
        } else {
          setError(e?.message || 'Failed to load payments');
        }
      } catch (cacheError) {
        console.log('❌ Cache error:', cacheError);
        setError(e?.message || 'Failed to load payments');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return darkMode ? '#10B981' : '#059669';
      case 'PENDING':
        return darkMode ? '#F59E0B' : '#D97706';
      default:
        return darkMode ? '#6B7280' : '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return t.confirmed;
      case 'PENDING':
        return t.pending;
      default:
        return status;
    }
  };

  if (loading) {
    return <DaritalLoader fullScreen darkMode={darkMode} />;
  }

  if (error) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
        ]}
      >
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text
          style={[styles.error, { color: darkMode ? '#FCA5A5' : '#EF4444' }]}
        >
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
      ]}
    >
      {/* Navbar */}
      <Navbar />

      {/* Offline Banner */}
      {isOffline && (
        <View
          style={[
            styles.offlineBanner,
            { backgroundColor: darkMode ? '#F59E0B' : '#FCD34D' },
          ]}
        >
          <Text
            style={[
              styles.offlineBannerText,
              { color: darkMode ? '#000000' : '#92400E' },
            ]}
          >
            📡 {t.offlineMode || 'Offline Mode'} - {t.showingCachedData || 'Showing cached data'}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: darkMode ? '#FBBF24' : '#1E40AF' },
          ]}
        >
          {darkMode && '💳 '}
          {t.paymentsHistory}
        </Text>

        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={darkMode ? '#FBBF24' : '#3B82F6'} />
          }
          renderItem={({ item, index }) => (
            <PaymentCard
              item={item}
              index={index}
              darkMode={darkMode}
              t={t}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              navigation={navigation}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: darkMode ? '#6B7280' : '#9CA3AF' },
                ]}
              >
                {t.noPayments}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

function PaymentCard({ item, index, darkMode, t, getStatusColor, getStatusText, navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            borderColor: darkMode ? '#374151' : '#E5E7EB',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: darkMode ? '#10B981' : '#10B981' },
          ]}
        >
          <Text style={styles.icon}>💰</Text>
        </View>
        <View style={styles.cardHeaderText}>
          {item.unitName && (
            <Text
              style={[
                styles.cardTitle,
                { color: darkMode ? '#FFFFFF' : '#1F2937' },
              ]}
            >
              🏠 {item.unitName}
            </Text>
          )}
          <Text
            style={[
              item.unitName ? styles.cardSubtext : styles.cardTitle,
              { color: item.unitName ? (darkMode ? '#9CA3AF' : '#6B7280') : (darkMode ? '#FFFFFF' : '#1F2937') },
            ]}
          >
            {item.method}
          </Text>
          <Text
            style={[
              styles.cardSubtext,
              { color: darkMode ? '#6B7280' : '#9CA3AF' },
            ]}
          >
            ID: {item.id.slice(0, 8)}...
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amountLabel,
              { color: darkMode ? '#9CA3AF' : '#6B7280' },
            ]}
          >
            {t.amount}
          </Text>
          <Text
            style={[
              styles.amount,
              { color: darkMode ? '#10B981' : '#059669' },
            ]}
          >
            UZS {item.amount.toLocaleString()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(item.status) + '20',
              borderColor: getStatusColor(item.status),
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status === 'CONFIRMED' && '✓ '}
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: darkMode ? '#374151' : '#E5E7EB',
          },
        ]}
      >
        <Text
          style={[
            styles.footerText,
            { color: darkMode ? '#6B7280' : '#9CA3AF' },
          ]}
        >
          {item.paidAt ? t.paidAt : (t.createdAt || 'Created')}: {
            item.paidAt 
              ? new Date(item.paidAt).toLocaleDateString('uz-UZ')
              : new Date(item.createdAt).toLocaleDateString('uz-UZ')
          } •{' '}
          {item.paidAt
            ? new Date(item.paidAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
            : new Date(item.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          }
        </Text>
      </View>

      {/* Tap to view hint */}
      <View style={styles.tapHintContainer}>
        <Text style={[styles.tapHint, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>
          👆 {t.tapToViewDetails || 'Tap to view details'}
        </Text>
      </View>
    </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tapHintContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  offlineBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
