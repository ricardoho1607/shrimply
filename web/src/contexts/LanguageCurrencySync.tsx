"use client";

import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { useCurrency } from './CurrencyContext';

export const LanguageCurrencySync = () => {
  const { currentLanguage, isLanguageLoaded } = useLanguage();
  const { syncCurrencyWithLanguage, isCurrencyLoaded } = useCurrency();

  useEffect(() => {
    if (!isLanguageLoaded || !isCurrencyLoaded) return;
    syncCurrencyWithLanguage(currentLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, isLanguageLoaded, isCurrencyLoaded]);

  return null;
};
