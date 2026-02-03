import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { apiGet } from '../api/client';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';

interface InvoiceQrScreenProps {
  route?: any;
  navigation?: any;
}

export default function InvoiceQrScreen({ route, navigation }: InvoiceQrScreenProps) {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useTheme();

  const invoiceId = route?.params?.invoiceId;

  useEffect(() => {
    if (invoiceId) {
      loadQrData();
    }
  }, [invoiceId]);

  const loadQrData = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await apiGet(`/invoices/${invoiceId}/qr`);
      setQrData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setChecking(true);
      const result = await apiGet(`/invoices/${invoiceId}/qr`);
      setQrData(result);
      
      if (result.paid) {
        Alert.alert(
          '✅ Payment Confirmed',
          'Your payment has been successfully processed!',
          [
            {
              text: 'OK',
              onPress: () => navigation?.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('⏳ Pending', 'Payment is still pending. Please try again in a moment.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to check payment status');
    } finally {
      setChecking(false);
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
        <TouchableOpacity
          onPress={loadQrData}
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

  const isPaid = qrData?.paid === true;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
      ]}
    >
      <Navbar />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: darkMode ? '#FBBF24' : '#1E40AF' },
              ]}
            >
              {isPaid ? '✅ Paid' : '📱 QR Payment'}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: darkMode ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              Invoice #{invoiceId?.slice(-8)}
            </Text>
          </View>

          {isPaid ? (
            // Already Paid View
            <View
              style={[
                styles.paidCard,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#10B981' : '#10B981',
                },
              ]}
            >
              <View style={[styles.paidIconContainer, { backgroundColor: '#10B981' }]}>
                <Text style={styles.paidIcon}>✅</Text>
              </View>
              <Text
                style={[
                  styles.paidTitle,
                  { color: darkMode ? '#FFFFFF' : '#1F2937' },
                ]}
              >
                Already Paid
              </Text>
              <Text
                style={[
                  styles.paidText,
                  { color: darkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                This invoice has been paid successfully
              </Text>
              <Text
                style={[
                  styles.paidAmount,
                  { color: darkMode ? '#10B981' : '#10B981' },
                ]}
              >
                UZS {qrData?.amount?.toLocaleString() || '—'}
              </Text>
              
              <TouchableOpacity
                onPress={() => navigation?.goBack()}
                style={[
                  styles.backButton,
                  { backgroundColor: darkMode ? '#374151' : '#E5E7EB' },
                ]}
              >
                <Text
                  style={[
                    styles.backButtonText,
                    { color: darkMode ? '#FFFFFF' : '#1F2937' },
                  ]}
                >
                  ← Back to Invoices
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // QR Code View
            <>
              {/* QR Code Card */}
              <View
                style={[
                  styles.qrCard,
                  {
                    backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                    borderColor: darkMode ? '#8B5CF6' : '#8B5CF6',
                  },
                ]}
              >
                <View style={styles.qrContainer}>
                  {qrData?.qrString ? (
                    <QRCode
                      value={qrData.qrString}
                      size={250}
                      backgroundColor={darkMode ? '#1F2937' : '#FFFFFF'}
                      color={darkMode ? '#FFFFFF' : '#000000'}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.noQrText,
                        { color: darkMode ? '#9CA3AF' : '#6B7280' },
                      ]}
                    >
                      No QR code available
                    </Text>
                  )}
                </View>

                {/* Amount */}
                <View style={styles.amountSection}>
                  <Text
                    style={[
                      styles.amountLabel,
                      { color: darkMode ? '#9CA3AF' : '#6B7280' },
                    ]}
                  >
                    Amount to Pay
                  </Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: darkMode ? '#FBBF24' : '#8B5CF6' },
                    ]}
                  >
                    UZS {qrData?.amount?.toLocaleString() || '—'}
                  </Text>
                </View>
              </View>

              {/* Instructions */}
              <View
                style={[
                  styles.instructionsCard,
                  {
                    backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                    borderColor: darkMode ? '#374151' : '#E5E7EB',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.instructionsTitle,
                    { color: darkMode ? '#FFFFFF' : '#1F2937' },
                  ]}
                >
                  📋 Instructions
                </Text>
                <Text
                  style={[
                    styles.instructionsText,
                    { color: darkMode ? '#9CA3AF' : '#6B7280' },
                  ]}
                >
                  1. Open your payment app (Click, Payme, Uzum Bank){'\n'}
                  2. Scan this QR code{'\n'}
                  3. Confirm the payment{'\n'}
                  4. Tap "Check Status" to verify payment
                </Text>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                onPress={checkPaymentStatus}
                disabled={checking}
                style={[
                  styles.checkButton,
                  {
                    backgroundColor: darkMode ? '#8B5CF6' : '#8B5CF6',
                    opacity: checking ? 0.6 : 1,
                  },
                ]}
              >
                {checking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkButtonText}>🔄 Check Payment Status</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation?.goBack()}
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: darkMode ? '#374151' : '#E5E7EB',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: darkMode ? '#FFFFFF' : '#1F2937' },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    paddingBottom: 40,
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
  header: {
    marginBottom: 24,
    alignItems: 'center',
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
  qrCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  qrContainer: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  noQrText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  instructionsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  checkButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  paidCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  paidIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  paidIcon: {
    fontSize: 48,
  },
  paidTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paidText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  paidAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

