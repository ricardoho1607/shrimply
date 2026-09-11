"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, Translations } from '../translations';

type LanguageContextType = {
  currentLanguage: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
  isLanguageLoaded: boolean;
};

const defaultLanguage: Language = 'en';

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: defaultLanguage,
  t: translations.en,
  isLanguageLoaded: true,
  setLanguage: async () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(defaultLanguage);
  const [t, setT] = useState<Translations>(translations[defaultLanguage]);
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const storedLang = localStorage.getItem('@language');
      if (storedLang && translations[storedLang as Language]) {
        setCurrentLanguage(storedLang as Language);
        setT(translations[storedLang as Language] as Translations);
      } else {
        const deviceLocale = navigator.language.split('-')[0] as Language;
        if (translations[deviceLocale]) {
          setCurrentLanguage(deviceLocale);
          setT(translations[deviceLocale] as Translations);
        }
      }
      setIsLanguageLoaded(true);
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    if (!translations[lang]) return;
    setCurrentLanguage(lang);
    setT(translations[lang] as Translations);
    localStorage.setItem('@language', lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, t, setLanguage, isLanguageLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export type { Language };
