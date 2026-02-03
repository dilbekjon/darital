import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';

interface MoreScreenProps {
  navigation?: any;
}

const MENU_ITEMS = [
  { id: 'Contracts', icon: '📄', labelKey: 'contractsList' },
  { id: 'Documents', icon: '📁', labelKey: 'documents' },
  { id: 'Settings', icon: '⚙️', labelKey: 'settings' },
];

export default function MoreScreen({ navigation }: MoreScreenProps) {
  const { darkMode } = useTheme();

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      contractsList: t.contractsList,
      documents: t.documents,
      settings: t.settings,
    };
    return labels[key] || key;
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
            onPress={() => navigation?.navigate(item.id)}
            style={[styles.menuItem, { backgroundColor: darkMode ? '#1F2937' : '#FFF', borderColor: darkMode ? '#374151' : '#E5E7EB' }]}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={[styles.menuLabel, { color: darkMode ? '#FFF' : '#1F2937' }]}>{getLabel(item.labelKey)}</Text>
            <Text style={[styles.menuArrow, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>›</Text>
          </TouchableOpacity>
        ))}
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
  menuIcon: { fontSize: 28, marginRight: 16 },
  menuLabel: { flex: 1, fontSize: 18, fontWeight: '600' },
  menuArrow: { fontSize: 24, fontWeight: '300' },
});
