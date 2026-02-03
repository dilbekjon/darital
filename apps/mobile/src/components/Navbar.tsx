import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function Navbar() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: darkMode ? '#111827' : '#FFFFFF',
        },
      ]}
    >
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: darkMode ? '#111827' : '#FFFFFF',
            borderBottomColor: darkMode ? '#374151' : '#E5E7EB',
          },
        ]}
      >
      {/* Theme Toggle - Right */}
      <TouchableOpacity
        onPress={toggleTheme}
        style={[
          styles.themeToggle,
          {
            backgroundColor: darkMode ? '#EAB308' : '#D1D5DB',
          },
        ]}
      >
        <View
          style={[
            styles.toggleCircle,
            {
              backgroundColor: darkMode ? '#111827' : '#FFFFFF',
              transform: [{ translateX: darkMode ? 28 : 2 }],
            },
          ]}
        >
          <Text style={styles.icon}>{darkMode ? '🌙' : '☀️'}</Text>
        </View>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  themeToggle: {
    width: 56,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    position: 'relative',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    fontSize: 12,
  },
});
