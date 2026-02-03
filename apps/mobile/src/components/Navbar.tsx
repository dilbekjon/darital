import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
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
        {/* Logo - Top Left */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoWrap: {
    width: 120,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 0,
    margin: 0,
    marginLeft: -20,
  },
  logo: {
    width: 120,
    height: 36,
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
