import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { getTenantContracts, TenantContract } from '../api/tenantApi';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';

interface ContractsScreenProps {
  navigation?: any;
}

export default function ContractsScreen({ navigation }: ContractsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<TenantContract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useTheme();

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setError(null);
      const data = await getTenantContracts();
      setContracts(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return t.draft || 'Draft';
      case 'ACTIVE': return t.active || 'Active';
      case 'COMPLETED': return t.completed || 'Completed';
      case 'CANCELLED': return t.cancelled || 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
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
          {darkMode && '📄 '}{t.contractsList}
        </Text>
        <FlatList
          data={contracts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation?.navigate('ContractDetail', { contractId: item.id, contract: item })}
              style={[
                styles.card,
                { backgroundColor: darkMode ? '#1F2937' : '#FFF', borderColor: darkMode ? '#374151' : '#E5E7EB' },
              ]}
            >
              <Text style={[styles.cardTitle, { color: darkMode ? '#FFF' : '#1F2937' }]}>
                {item.unit?.name || t.unit}
              </Text>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{t.startDate}: {formatDate(item.startDate)}</Text>
                <Text style={[styles.cardLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{t.endDate}: {formatDate(item.endDate)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={[styles.amount, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>UZS {Number(item.amount).toLocaleString()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (darkMode ? '#10B981' : '#059669') + '30' }]}>
                  <Text style={[styles.statusText, { color: darkMode ? '#6EE7B7' : '#059669' }]}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>
              <Text style={[styles.viewPdf, { color: darkMode ? '#FBBF24' : '#3B82F6' }]}>{t.viewPDF} ›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={[styles.emptyText, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>{t.noContracts}</Text>
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
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardLabel: { fontSize: 13 },
  amount: { fontSize: 18, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  viewPdf: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 48 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});
