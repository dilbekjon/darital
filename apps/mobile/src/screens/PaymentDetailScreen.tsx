import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { apiGet } from '../api/client';
import { refreshTenantPayment, getReceiptForPayment } from '../api/tenantApi';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';

interface PaymentDetailScreenProps {
  route: {
    params: {
      paymentId: string;
    };
  };
  navigation: any;
}

export default function PaymentDetailScreen({ route, navigation }: PaymentDetailScreenProps) {
  const { paymentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const { darkMode } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadPaymentDetail();
  }, [paymentId]);

  useEffect(() => {
    if (payment) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [payment]);

  const loadPaymentDetail = async () => {
    try {
      setError(null);
      const result = await apiGet(`/tenant/payments/${paymentId}`);
      setPayment(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await refreshTenantPayment(paymentId);
      await loadPaymentDetail();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewReceipt = async () => {
    setLoadingReceipt(true);
    try {
      const data = await getReceiptForPayment(paymentId);
      const msg = [
        data?.paymentId && `ID: ${String(data.paymentId).slice(0, 12)}...`,
        data?.amount != null && `Amount: ${Number(data.amount).toLocaleString()} UZS`,
        data?.paidAt && `Paid: ${new Date(data.paidAt).toLocaleString()}`,
      ].filter(Boolean).join('\n');
      Alert.alert(t.receipt || 'Receipt', msg || 'Receipt data');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load receipt');
    } finally {
      setLoadingReceipt(false);
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

  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'ONLINE':
        return '💳';
      case 'OFFLINE':
        return '💵';
      case 'CASH':
        return '💰';
      case 'BANK':
        return '🏦';
      default:
        return '💸';
    }
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return t.notAvailable || 'N/A';
    const d = new Date(date);
    return `${d.toLocaleDateString('uz-UZ')} • ${d.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  if (loading) {
    return <DaritalLoader fullScreen darkMode={darkMode} />;
  }

  if (error || !payment) {
    return (
      <View style={[styles.center, { backgroundColor: darkMode ? '#000000' : '#F0F9FF' }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.error, { color: darkMode ? '#FCA5A5' : '#EF4444' }]}>
          {error || 'Payment not found'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' }]}
        >
          <Text style={styles.backButtonText}>{t.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000000' : '#F0F9FF' }]}>
      <Navbar title={t.paymentDetails || 'Payment Details'} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Main Payment Card */}
          <View
            style={[
              styles.mainCard,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: getStatusColor(payment.status),
              },
            ]}
          >
            {/* Header with Icon */}
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getStatusColor(payment.status) },
                ]}
              >
                <Text style={styles.icon}>{getMethodIcon(payment.method)}</Text>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.mainTitle, { color: darkMode ? '#FFFFFF' : '#1F2937' }]}>
                  {payment.method}
                </Text>
                <Text style={[styles.paymentId, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>
                  ID: {payment.id.slice(0, 12)}...
                </Text>
              </View>
            </View>

            {/* Amount Display */}
            <View style={styles.amountSection}>
              <Text style={[styles.amountLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {t.amount}
              </Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: payment.status === 'CONFIRMED' ? '#10B981' : darkMode ? '#FBBF24' : '#3B82F6' },
                ]}
              >
                {payment.amount.toLocaleString()} UZS
              </Text>
            </View>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(payment.status) + '20',
                  borderColor: getStatusColor(payment.status),
                },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                {payment.status === 'CONFIRMED' && '✓ '}
                {getStatusText(payment.status).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View
            style={[
              styles.detailsCard,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>
              📋 {t.paymentInformation || 'Payment Information'}
            </Text>

            <DetailRow
              label={t.paymentMethod || 'Payment Method'}
              value={payment.method}
              darkMode={darkMode}
            />
            <DetailRow
              label={t.status || 'Status'}
              value={getStatusText(payment.status)}
              darkMode={darkMode}
            />
            <DetailRow
              label={t.createdAt || 'Created At'}
              value={formatDateTime(payment.createdAt)}
              darkMode={darkMode}
            />
            <DetailRow
              label={payment.status === 'CONFIRMED' ? (t.confirmedAt || 'Confirmed At') : (t.paidAt || 'Paid At')}
              value={formatDateTime(payment.paidAt)}
              darkMode={darkMode}
              isLast
            />
          </View>

          {/* Invoice Section */}
          <View
            style={[
              styles.detailsCard,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>
              🧾 {t.invoiceInformation || 'Invoice Information'}
            </Text>

            <DetailRow
              label={t.invoiceId || 'Invoice ID'}
              value={payment.invoice.id.slice(0, 12) + '...'}
              darkMode={darkMode}
            />
            <DetailRow
              label={t.unit}
              value={payment.invoice.unitName}
              darkMode={darkMode}
            />
            <DetailRow
              label={t.invoiceAmount || 'Invoice Amount'}
              value={`${payment.invoice.amount.toLocaleString()} UZS`}
              darkMode={darkMode}
            />
            <DetailRow
              label={t.dueDate || 'Due Date'}
              value={new Date(payment.invoice.dueDate).toLocaleDateString('uz-UZ')}
              darkMode={darkMode}
            />
            <DetailRow
              label={t.invoiceStatus || 'Invoice Status'}
              value={payment.invoice.status}
              darkMode={darkMode}
              isLast
            />

            <TouchableOpacity
              style={[
                styles.viewInvoiceButton,
                { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' },
              ]}
              onPress={() => {
                navigation.navigate('InvoiceQr', { invoiceId: payment.invoice.id });
              }}
            >
              <Text style={styles.viewInvoiceText}>
                📄 {t.viewInvoice || 'View Invoice'}
              </Text>
            </TouchableOpacity>

            {payment.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.viewInvoiceButton, { backgroundColor: darkMode ? '#6B7280' : '#9CA3AF', marginTop: 8 }]}
                onPress={handleRefreshStatus}
                disabled={refreshing}
              >
                <Text style={styles.viewInvoiceText}>
                  {refreshing ? '...' : '🔄 Refresh status'}
                </Text>
              </TouchableOpacity>
            )}
            {payment.status === 'CONFIRMED' && (
              <TouchableOpacity
                style={[styles.viewInvoiceButton, { backgroundColor: '#10B981', marginTop: 8 }]}
                onPress={handleViewReceipt}
                disabled={loadingReceipt}
              >
                <Text style={styles.viewInvoiceText}>
                  {loadingReceipt ? '...' : '📥 ' + (t.receipt || 'Receipt')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={[
              styles.backButtonBottom,
              { backgroundColor: darkMode ? '#374151' : '#F3F4F6' },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonBottomText, { color: darkMode ? '#FFFFFF' : '#1F2937' }]}>
              ← {t.backToPayments || 'Back to Payments'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  darkMode,
  isLast = false,
}: {
  label: string;
  value: string;
  darkMode: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: darkMode ? '#374151' : '#E5E7EB',
        },
      ]}
    >
      <Text style={[styles.detailLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: darkMode ? '#FFFFFF' : '#1F2937' }]}>
        {value}
      </Text>
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
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 32,
  },
  headerTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentId: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  detailsCard: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  viewInvoiceButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  viewInvoiceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonBottom: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  backButtonBottomText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

