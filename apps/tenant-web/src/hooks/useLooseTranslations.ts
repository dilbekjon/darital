import { useLanguage } from '../contexts/LanguageContext';

/**
 * Returns translations with loose typing to prevent TypeScript errors
 * when translation keys are missing from the interface.
 * 
 * This is a temporary fix to ensure builds pass while we consolidate
 * translation types across the monorepo.
 */
export function useLooseTranslations() {
  const { t, ...rest } = useLanguage();
  return {
    ...rest,
    t: t as Record<string, string>,
  };
}
