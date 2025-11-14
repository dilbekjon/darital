import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';
import { getTranslations } from '../lib/i18n';

/**
 * Safe translation hook that works even without LanguageProvider
 * 
 * If LanguageProvider is available, uses context.
 * Otherwise, falls back to default Uzbek translations.
 */
export function useTranslation() {
  // Try to get context, but don't throw if undefined
  const context = useContext(LanguageContext as any);
  
  if (context) {
    // LanguageProvider is mounted
    return context;
  }
  
  // Fallback: Return default translations (no language switching)
  return {
    language: 'uz' as const,
    setLanguage: () => {
      console.warn('[useTranslation] LanguageProvider not found, cannot change language');
    },
    t: getTranslations('uz'),
  };
}

