"use client";

import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { useCurrency } from './CurrencyContext';

export const LanguageCurrencySync = () => {
  const { currentLanguage } = useLanguage();
  const { syncCurrencyWithLanguage } = useCurrency();

  useEffect(() => {
    syncCurrencyWithLanguage(currentLanguage);
  }, [currentLanguage, syncCurrencyWithLanguage]);

  return null;
};
