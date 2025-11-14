import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language, languageNames, languageFlags } from '../lib/i18n';

export function Navbar() {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { darkMode, toggleTheme } = useTheme();

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

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
      {/* Language Selector - Left */}
      <TouchableOpacity
        onPress={() => setShowLangMenu(true)}
        style={[
          styles.button,
          {
            backgroundColor: darkMode ? '#1F2937' : '#F3F4F6',
            borderColor: darkMode ? '#EAB308' : '#D1D5DB',
          },
        ]}
      >
        <Text style={styles.flagText}>{languageFlags[language]}</Text>
        <Text
          style={[
            styles.buttonText,
            { color: darkMode ? '#FFFFFF' : '#1F2937' },
          ]}
        >
          {languageNames[language]}
        </Text>
        <Text style={[styles.arrow, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>▼</Text>
      </TouchableOpacity>

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

      {/* Language Modal */}
      <Modal
        visible={showLangMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangMenu(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                borderColor: darkMode ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            {(['en', 'ru', 'uz'] as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => selectLanguage(lang)}
                style={[
                  styles.languageOption,
                  {
                    backgroundColor:
                      language === lang
                        ? darkMode
                          ? '#EAB308'
                          : '#3B82F6'
                        : 'transparent',
                  },
                ]}
              >
                <Text style={styles.flagText}>{languageFlags[lang]}</Text>
                <Text
                  style={[
                    styles.languageText,
                    {
                      color:
                        language === lang
                          ? darkMode
                            ? '#000000'
                            : '#FFFFFF'
                          : darkMode
                          ? '#FFFFFF'
                          : '#1F2937',
                    },
                  ]}
                >
                  {languageNames[lang]}
                </Text>
                {language === lang && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  flagText: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 200,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

