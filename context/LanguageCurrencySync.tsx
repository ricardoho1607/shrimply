// context/LanguageCurrencySync.tsx
// This component syncs currency with language changes when auto-sync is enabled
import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { useCurrency } from './CurrencyContext';

export const LanguageCurrencySync = ({ children }: { children: React.ReactNode }) => {
  const { currentLanguage, isLanguageLoaded } = useLanguage();
  const { syncCurrencyWithLanguage, isCurrencyLoaded } = useCurrency();

  useEffect(() => {
    if (!isLanguageLoaded || !isCurrencyLoaded) return;
    // Sync currency when language changes
    syncCurrencyWithLanguage(currentLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, isLanguageLoaded, isCurrencyLoaded]);

  return <>{children}</>;
};
