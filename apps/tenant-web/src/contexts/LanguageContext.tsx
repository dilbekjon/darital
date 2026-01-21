'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '../lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Record<string, string>; // Loose typing to prevent missing key errors
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('uz'); // Default to Uzbek
  const [t, setT] = useState<Translations>(getTranslations('uz'));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['en', 'ru', 'uz'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
      setT(getTranslations(savedLanguage));
    } else {
      // Set default to Uzbek if nothing saved
      localStorage.setItem('language', 'uz');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setT(getTranslations(lang));
    localStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: t as unknown as Record<string, string> }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

