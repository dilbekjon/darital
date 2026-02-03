import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';

interface MoreScreenProps {
  navigation?: any;
  route?: { params?: { onLogout?: () => void } };
}

const MENU_ITEMS = [
  { id: 'Payments', icon: 'file-document-outline', labelKey: 'paymentHistory', isIcon: true },
  { id: 'Contracts', icon: '📄', labelKey: 'contractsList', isIcon: false },
  { id: 'Documents', icon: '📁', labelKey: 'documents', isIcon: false },
  { id: 'Settings', icon: '⚙️', labelKey: 'settings', isIcon: false },
];

export default function MoreScreen({ navigation, route }: MoreScreenProps) {
  const { darkMode } = useTheme();
  const onLogout = route?.params?.onLogout;

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      contractsList: t.contractsList,
      documents: t.documents,
      settings: t.settings,
      payments: t.payments,
      paymentHistory: t.paymentHistory,
    };
    return labels[key] || key;
  };

  const handlePress = (item: (typeof MENU_ITEMS)[0]) => {
    navigation?.navigate(item.id);
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000' : '#F0F9FF' }]}>
      <Navbar />
      <View style={styles.content}>
        <Text style={[styles.title, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>
          {darkMode && '✦ '}{t.more}
        </Text>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item)}
            style={[styles.menuItem, { backgroundColor: darkMode ? '#1F2937' : '#FFF', borderColor: darkMode ? '#374151' : '#E5E7EB' }]}
          >
            {item.isIcon ? (
              <View style={[styles.iconWrap, { backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.12)' }]}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={darkMode ? '#93C5FD' : '#3B82F6'} />
              </View>
            ) : (
              <Text style={styles.menuIcon}>{item.icon}</Text>
            )}
            <Text style={[styles.menuLabel, { color: darkMode ? '#FFF' : '#1F2937' }]}>{getLabel(item.labelKey)}</Text>
            <Text style={[styles.menuArrow, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>›</Text>
          </TouchableOpacity>
        ))}
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={[styles.menuItem, styles.logoutItem, { backgroundColor: darkMode ? '#7F1D1D' : '#FEE2E2', borderColor: darkMode ? '#991B1B' : '#FECACA' }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)' }]}>
              <MaterialCommunityIcons name="logout-variant" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.menuLabel, { color: darkMode ? '#FCA5A5' : '#DC2626' }]}>{t.logout}</Text>
            <Text style={[styles.menuArrow, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  logoutItem: {
    marginTop: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuIcon: { fontSize: 28, marginRight: 16 },
  menuLabel: { flex: 1, fontSize: 18, fontWeight: '600' },
  menuArrow: { fontSize: 24, fontWeight: '300' },
});
