import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { getApiUrl } from '../lib/constants-fallback';
import { t } from '../lib/i18n';

interface ContractDetailScreenProps {
  route: { params: { contractId: string; contract: any } };
  navigation: any;
}

export default function ContractDetailScreen({ route, navigation }: ContractDetailScreenProps) {
  const { contract } = route.params;
  const { darkMode } = useTheme();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const openPdf = () => {
    let url = contract?.pdfUrl || '';
    if (!url) return Alert.alert(t.error, t.noContractPdf);
    if (!url.startsWith('http')) {
      const base = getApiUrl().replace(/\/api\/?$/, '');
      url = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
    }
    Linking.openURL(url).catch(() => Alert.alert(t.error, t.couldNotOpenPdf));
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000' : '#F0F9FF' }]}>
      <Navbar />
      <View style={styles.content}>
        <Text style={[styles.title, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>{t.contract}</Text>
        <View style={[styles.card, { backgroundColor: darkMode ? '#1F2937' : '#FFF', borderColor: darkMode ? '#374151' : '#E5E7EB' }]}>
          <Text style={[styles.cardTitle, { color: darkMode ? '#FFF' : '#1F2937' }]}>{contract?.unit?.name || t.unit}</Text>
          <Text style={[styles.label, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{t.startDate}: {contract ? formatDate(contract.startDate) : '—'}</Text>
          <Text style={[styles.label, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{t.endDate}: {contract ? formatDate(contract.endDate) : '—'}</Text>
          <Text style={[styles.amount, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>UZS {contract ? Number(contract.amount).toLocaleString() : '0'}</Text>
          <TouchableOpacity onPress={openPdf} style={[styles.button, { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' }]}>
            <Text style={styles.buttonText}>{t.viewPDF}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { borderRadius: 16, padding: 20, borderWidth: 2 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 4 },
  amount: { fontSize: 22, fontWeight: 'bold', marginTop: 12, marginBottom: 20 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
