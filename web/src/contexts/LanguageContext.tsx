"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Language, Translations } from '../translations';
import { englishTranslations, isLanguage, loadTranslations } from '../translations/loadTranslations';

type LanguageContextType = {
  currentLanguage: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
  isLanguageLoaded: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en', t: englishTranslations, isLanguageLoaded: true,
  setLanguage: async () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState({ currentLanguage: 'en' as Language, t: englishTranslations });
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    const request = ++requestId.current;
    let preferred: Language = 'en';
    try {
      const stored = localStorage.getItem('@language');
      const device = navigator.language.split('-')[0];
      preferred = isLanguage(stored) ? stored : isLanguage(device) ? device : 'en';
    } catch { /* Private browsing can deny storage. English remains available. */ }
    loadTranslations(preferred).then(t => {
      if (active && request === requestId.current) setLanguageState({ currentLanguage: preferred, t });
    }).catch(error => {
      console.error('Unable to load language:', error);
    }).finally(() => {
      if (active && request === requestId.current) setIsLanguageLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    if (!isLanguage(lang)) return;
    const request = ++requestId.current;
    try {
      const t = await loadTranslations(lang);
      if (request !== requestId.current) return;
      setLanguageState({ currentLanguage: lang, t });
      setIsLanguageLoaded(true);
      try { localStorage.setItem('@language', lang); } catch { /* Keep the in-memory selection. */ }
    } catch (error) {
      if (request === requestId.current) setIsLanguageLoaded(true);
      console.error('Unable to load language:', error);
    }
  }, []);

  const value = useMemo(() => ({ ...language, setLanguage, isLanguageLoaded }), [language, setLanguage, isLanguageLoaded]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => useContext(LanguageContext);
export type { Language };
