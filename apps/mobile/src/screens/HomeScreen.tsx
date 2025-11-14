import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { hasPasscode } from '../state/authStore';

interface HomeScreenProps {
  onSetupPasscode?: () => void;
  navigation?: any;
}

export default function HomeScreen({ onSetupPasscode, navigation }: HomeScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const { t } = useLanguage();
  const { darkMode } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef([
    new Animated.Value(30),
    new Animated.Value(30),
    new Animated.Value(30),
    new Animated.Value(30),
  ]).current;

  useEffect(() => {
    loadData();
    checkPasscode();
  }, []);

  const checkPasscode = async () => {
    const hasP = await hasPasscode();
    setHasPass(hasP);
  };

  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.stagger(
          150,
          slideAnims.map((anim) =>
            Animated.spring(anim, {
              toValue: 0,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            })
          )
        ),
      ]).start();
    }
  }, [loading, error]);

  const loadCachedData = async () => {
    try {
      const [cachedProfile, cachedBalance, cachedInvoices] = await Promise.all([
        AsyncStorage.getItem('lastFetchedTenant'),
        AsyncStorage.getItem('lastFetchedBalance'),
        AsyncStorage.getItem('lastFetchedInvoices'),
      ]);

      if (cachedProfile) setProfile(JSON.parse(cachedProfile));
      if (cachedBalance) setBalance(JSON.parse(cachedBalance));
      if (cachedInvoices) setInvoices(JSON.parse(cachedInvoices));
    } catch (e) {
      console.log('Failed to load cached data:', e);
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      setIsOffline(false);
      setLoading(true);

      // Try to load from API
      const [me, bal, inv] = await Promise.all([
        apiGet('/tenant/me'),
        apiGet('/tenant/balance'),
        apiGet('/tenant/invoices'),
      ]);

      setProfile(me);
      setBalance(bal);
      setInvoices(inv);

      // Cache the data
      await Promise.all([
        AsyncStorage.setItem('lastFetchedTenant', JSON.stringify(me)),
        AsyncStorage.setItem('lastFetchedBalance', JSON.stringify(bal)),
        AsyncStorage.setItem('lastFetchedInvoices', JSON.stringify(inv)),
      ]);
    } catch (e: any) {
      // If network fails, try to load cached data
      setIsOffline(true);
      setError(e?.message || 'Failed to load data');
      await loadCachedData();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  if (error && !profile) {
    // Show error only if no cached data
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
        <TouchableOpacity
          onPress={loadData}
          style={[
            styles.retryButton,
            { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' },
          ]}
        >
          <Text
            style={[
              styles.retryText,
              { color: darkMode ? '#000000' : '#FFFFFF' },
            ]}
          >
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tenantName = profile?.fullName || '—';
  const unitName = profile?.contracts?.[0]?.unit?.name || '—';
  const bal = balance?.current ?? 0;

  // Find next due invoice
  const now = new Date();
  const upcomingInvoices = invoices
    ?.filter((inv: any) => new Date(inv.dueDate) >= now && inv.status === 'PENDING')
    ?.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextInvoice = upcomingInvoices?.[0];
  const nextAmount = nextInvoice?.amount || 0;
  const nextDueDate = nextInvoice?.dueDate 
    ? new Date(nextInvoice.dueDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
      ]}
    >
      {/* Navbar */}
      <Navbar />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={darkMode ? '#FBBF24' : '#3B82F6'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim }]}
        >
          {/* Offline Banner */}
          {isOffline && (
            <View style={[styles.offlineBanner, { backgroundColor: darkMode ? '#EAB308' : '#FEF3C7' }]}>
              <Text style={[styles.offlineText, { color: darkMode ? '#000000' : '#92400E' }]}>
                📡 Offline mode • Showing cached data
              </Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: darkMode ? '#FBBF24' : '#1E40AF' },
              ]}
            >
              👋 Salom, {tenantName?.split(' ')[0] || 'Foydalanuvchi'}!
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: darkMode ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              {darkMode ? t.premiumOverview : t.propertyOverview}
            </Text>
          </View>

          {/* Balance Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: darkMode ? '#EAB308' : '#E5E7EB',
                transform: [{ translateY: slideAnims[0] }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: darkMode ? '#EAB308' : '#3B82F6',
                  },
                ]}
              >
                <Text style={styles.icon}>💰</Text>
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: darkMode ? '#FBBF24' : '#6B7280' },
                ]}
              >
                {t.balance}
              </Text>
            </View>
            <Text
              style={[
                styles.cardValue,
                {
                  color: bal >= 0
                    ? darkMode
                      ? '#FFFFFF'
                      : '#1F2937'
                    : '#EF4444',
                },
              ]}
            >
              UZS {bal.toLocaleString()}
            </Text>
            <Text
              style={[
                styles.cardSubtext,
                { color: darkMode ? '#6B7280' : '#9CA3AF' },
              ]}
            >
              {t.currentBalance}
            </Text>
          </Animated.View>

          {/* Tenant Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
                transform: [{ translateY: slideAnims[1] }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: darkMode ? '#10B981' : '#10B981',
                  },
                ]}
              >
                <Text style={styles.icon}>👤</Text>
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: darkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                Tenant
              </Text>
            </View>
            <Text
              style={[
                styles.cardValue,
                { color: darkMode ? '#FFFFFF' : '#1F2937' },
              ]}
            >
              {tenantName}
            </Text>
            <Text
              style={[
                styles.cardSubtext,
                { color: darkMode ? '#6B7280' : '#9CA3AF' },
              ]}
            >
              {profile?.phone || '—'}
            </Text>
          </Animated.View>

          {/* Unit Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
                transform: [{ translateY: slideAnims[2] }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: darkMode ? '#8B5CF6' : '#8B5CF6',
                  },
                ]}
              >
                <Text style={styles.icon}>🏠</Text>
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: darkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                {t.property}
              </Text>
            </View>
            <Text
              style={[
                styles.cardValue,
                { color: darkMode ? '#FFFFFF' : '#1F2937' },
              ]}
            >
              {unitName}
            </Text>
            <Text
              style={[
                styles.cardSubtext,
                { color: darkMode ? '#6B7280' : '#9CA3AF' },
              ]}
            >
              {t.yourActiveUnit}
            </Text>
          </Animated.View>

          {/* Next Invoice Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: nextInvoice ? (darkMode ? '#F97316' : '#FB923C') : (darkMode ? '#374151' : '#E5E7EB'),
                transform: [{ translateY: slideAnims[3] }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: nextInvoice ? '#F97316' : (darkMode ? '#6B7280' : '#9CA3AF'),
                  },
                ]}
              >
                <Text style={styles.icon}>📅</Text>
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  { color: darkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                Keyingi to'lov
              </Text>
            </View>
            <Text
              style={[
                styles.cardValue,
                { color: nextInvoice ? (darkMode ? '#FB923C' : '#F97316') : (darkMode ? '#FFFFFF' : '#1F2937') },
              ]}
            >
              {nextInvoice ? `UZS ${nextAmount.toLocaleString()}` : 'Yo\'q'}
            </Text>
            <Text
              style={[
                styles.cardSubtext,
                { color: darkMode ? '#6B7280' : '#9CA3AF' },
              ]}
            >
              {nextInvoice ? `Muddat: ${nextDueDate}` : 'Hozircha to\'lovlar yo\'q'}
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={() => navigation?.navigate('Invoices')}
              style={[
                styles.actionButton,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#3B82F6' : '#3B82F6',
                },
              ]}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.actionIcon}>📄</Text>
              </View>
              <Text style={[styles.actionText, { color: darkMode ? '#FFFFFF' : '#1F2937' }]}>
                View Invoices
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation?.navigate('Payments')}
              style={[
                styles.actionButton,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#10B981' : '#10B981',
                },
              ]}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#10B981' }]}>
                <Text style={styles.actionIcon}>💳</Text>
              </View>
              <Text style={[styles.actionText, { color: darkMode ? '#FFFFFF' : '#1F2937' }]}>
                View Payments
              </Text>
            </TouchableOpacity>

            {nextInvoice && (
              <TouchableOpacity
                onPress={() => navigation?.navigate('Invoices')}
                style={[
                  styles.payNowButton,
                  { backgroundColor: darkMode ? '#F97316' : '#F97316' },
                ]}
              >
                <Text style={styles.payNowText}>💰 Pay Now</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Passcode Setup Button */}
          {!hasPass && onSetupPasscode && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Security',
                  'Set up a passcode to protect your account?',
                  [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Set Up', onPress: onSetupPasscode },
                  ]
                );
              }}
              style={[
                styles.passcodeButton,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#EAB308' : '#3B82F6',
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
                  <Text style={styles.icon}>🔒</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.passcodeTitle,
                      { color: darkMode ? '#FFFFFF' : '#1F2937' },
                    ]}
                  >
                    Set Up Passcode
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtext,
                      { color: darkMode ? '#6B7280' : '#9CA3AF' },
                    ]}
                  >
                    Add extra security with Face ID
                  </Text>
                </View>
                <Text style={{ fontSize: 20, color: darkMode ? '#FBBF24' : '#3B82F6' }}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 20,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  passcodeButton: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  passcodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  offlineBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '700',
  },
  payNowButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
