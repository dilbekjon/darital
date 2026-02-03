import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { getTenantDocuments, getReceiptForPayment, TenantDocument } from '../api/tenantApi';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';
import { getApiUrl } from '../lib/constants-fallback';

interface DocumentsScreenProps {
  navigation?: any;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  LEASE_AGREEMENT: 'Lease',
  ID_COPY: 'ID',
  PASSPORT: 'Passport',
  PAYMENT_RECEIPT: 'Receipt',
  CONTRACT_ATTACHMENT: 'Attachment',
  OTHER: 'Other',
};

export default function DocumentsScreen({ navigation }: DocumentsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      setError(null);
      const data = await getTenantDocuments();
      setDocuments(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const openDocument = async (doc: TenantDocument) => {
    if (doc.type === 'PAYMENT_RECEIPT') {
      setLoadingDocId(doc.id);
      try {
        const paymentId = doc.fileUrl.split('/').pop();
        if (!paymentId) throw new Error('Invalid receipt');
        const data = await getReceiptForPayment(paymentId);
        Alert.alert(
          'Receipt',
          `Payment: ${data?.paymentId || '—'}\nAmount: ${data?.amount != null ? Number(data.amount).toLocaleString() : '—'} UZS\nDate: ${data?.paidAt ? new Date(data.paidAt).toLocaleString() : '—'}`,
          [{ text: 'OK' }]
        );
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load receipt');
      } finally {
        setLoadingDocId(null);
      }
      return;
    }
    let url = doc.fileUrl;
    if (!url.startsWith('http')) {
      const base = getApiUrl().replace(/\/api\/?$/, '');
      url = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
    }
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open document'));
  };

  if (loading || loadingDocId) {
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
      <View style={styles.content}>
        <Text style={[styles.title, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>
          {darkMode && '📁 '}{t.documents || 'Documents'}
        </Text>
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDocument(item)}
              style={[styles.card, { backgroundColor: darkMode ? '#1F2937' : '#FFF', borderColor: darkMode ? '#374151' : '#E5E7EB' }]}
            >
              <Text style={[styles.typeBadge, { color: darkMode ? '#93C5FD' : '#2563EB' }]}>
                {DOC_TYPE_LABELS[item.type] || item.type}
              </Text>
              <Text style={[styles.cardTitle, { color: darkMode ? '#FFF' : '#1F2937' }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.meta, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {new Date(item.createdAt).toLocaleDateString()} · {formatSize(item.fileSize)}
              </Text>
              <Text style={[styles.download, { color: darkMode ? '#FBBF24' : '#3B82F6' }]}>
                📥 Download
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={[styles.emptyText, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>{t.noDocuments || 'No documents'}</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  error: { fontSize: 16, textAlign: 'center', fontWeight: '600' },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2 },
  typeBadge: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 8 },
  download: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 48 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});
