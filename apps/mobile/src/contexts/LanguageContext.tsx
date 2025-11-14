import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, getTranslations, Translations } from '../lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('uz'); // Default to Uzbek
  const [t, setT] = useState<Translations>(getTranslations('uz'));

  useEffect(() => {
    // Load language from AsyncStorage on mount
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language') as Language;
      if (savedLanguage && ['en', 'ru', 'uz'].includes(savedLanguage)) {
        setLanguageState(savedLanguage);
        setT(getTranslations(savedLanguage));
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    setT(getTranslations(lang));
    try {
      await AsyncStorage.setItem('language', lang);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // Instead of throwing, return safe defaults
    console.warn('[useLanguage] LanguageProvider not found, using default translations');
    return {
      language: 'uz' as Language,
      setLanguage: () => {
        console.warn('[useLanguage] Cannot change language without LanguageProvider');
      },
      t: getTranslations('uz'),
    };
  }
  return context;
}

