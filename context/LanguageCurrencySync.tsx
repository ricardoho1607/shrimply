// context/LanguageCurrencySync.tsx
// This component syncs currency with language changes when auto-sync is enabled
import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { useCurrency } from './CurrencyContext';

export const LanguageCurrencySync = ({ children }: { children: React.ReactNode }) => {
  const { currentLanguage } = useLanguage();
  const { syncCurrencyWithLanguage } = useCurrency();

  useEffect(() => {
    // Sync currency when language changes
    syncCurrencyWithLanguage(currentLanguage);
  }, [currentLanguage, syncCurrencyWithLanguage]);

  return <>{children}</>;
};
