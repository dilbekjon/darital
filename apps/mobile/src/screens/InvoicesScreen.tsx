import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Animated,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';

const INVOICES_CACHE_KEY = 'invoicesCache';

interface InvoicesScreenProps {
  navigation?: any;
}

export default function InvoicesScreen({ navigation }: InvoicesScreenProps) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setError(null);
      setIsOffline(false);
      
      // Try to fetch from API
      const result = await apiGet('/tenant/invoices');
      
      // Handle paginated response: { data, meta } or legacy array format
      let invoiceList: any[];
      let meta: { page: number; limit: number; total: number } | null = null;
      
      if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        // New paginated format
        invoiceList = result.data;
        meta = result.meta || null;
        setPaginationMeta(meta);
      } else if (Array.isArray(result)) {
        // Legacy array format (backward compatibility)
        invoiceList = result;
        setPaginationMeta(null);
      } else {
        throw new Error('Invalid response format from API');
      }
      
      setInvoices(invoiceList);
      
      // Cache the result (store as array for backward compatibility)
      await AsyncStorage.setItem(INVOICES_CACHE_KEY, JSON.stringify(invoiceList));
      console.log('✅ Invoices cached successfully', meta ? `(${invoiceList.length} of ${meta.total})` : '');
    } catch (e: any) {
      console.log('⚠️ API error, attempting to load from cache:', e.message);
      
      // Fallback to cached data
      try {
        const cachedData = await AsyncStorage.getItem(INVOICES_CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Cached data is always an array (for backward compatibility)
          setInvoices(Array.isArray(parsed) ? parsed : []);
          setPaginationMeta(null); // No pagination info in cache
          setIsOffline(true);
          console.log('✅ Loaded from cache (offline mode)');
        } else {
          setError(e?.message || 'Failed to load invoices');
        }
      } catch (cacheError) {
        console.log('❌ Cache error:', cacheError);
        setError(e?.message || 'Failed to load invoices');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return darkMode ? '#10B981' : '#059669';
      case 'PENDING':
        return darkMode ? '#F59E0B' : '#D97706';
      case 'OVERDUE':
        return darkMode ? '#EF4444' : '#DC2626';
      default:
        return darkMode ? '#6B7280' : '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return t.paid;
      case 'PENDING':
        return t.pending;
      case 'OVERDUE':
        return t.overdue;
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={darkMode ? '#FBBF24' : '#3B82F6'}
        />
        <Text
          style={[
            styles.loadingText,
            { color: darkMode ? '#9CA3AF' : '#6B7280' },
          ]}
        >
          {t.loading}
        </Text>
      </View>
    );
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
          {darkMode && '📄 '}
          {t.invoicesList}
        </Text>

        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <InvoiceCard
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
              <Text style={styles.emptyIcon}>📭</Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: darkMode ? '#6B7280' : '#9CA3AF' },
                ]}
              >
                {t.noInvoices}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

function InvoiceCard({ item, index, darkMode, t, getStatusColor, getStatusText, navigation }: any) {
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

  const isPending = item.status === 'PENDING' || item.status === 'OVERDUE';

  return (
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
            { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' },
          ]}
        >
          <Text style={styles.icon}>🏠</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text
            style={[
              styles.cardTitle,
              { color: darkMode ? '#FFFFFF' : '#1F2937' },
            ]}
          >
            {item.unitName}
          </Text>
          <Text
            style={[
              styles.cardSubtext,
              { color: darkMode ? '#6B7280' : '#9CA3AF' },
            ]}
          >
            {t.dueDate}: {new Date(item.dueDate).toLocaleDateString('uz-UZ')}
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
              { color: darkMode ? '#FBBF24' : '#1E40AF' },
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
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {/* Pay via QR Button */}
      {isPending && navigation && (
        <TouchableOpacity
          onPress={() => navigation.navigate('InvoiceQr', { invoiceId: item.id })}
          style={[
            styles.qrButton,
            {
              backgroundColor: darkMode ? '#8B5CF6' : '#8B5CF6',
            },
          ]}
        >
          <Text style={styles.qrButtonText}>📱 Pay via QR</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
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
  qrButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
