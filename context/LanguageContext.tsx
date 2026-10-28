// contexts/LanguageContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { translations, Language, Translations } from '../app/translations';

type LanguageContextType = {
  currentLanguage: Language;  // ✅ Changed from `language: string`
  setLanguage: (lang: Language) => Promise<void>;  // ✅ Changed to accept Language and return Promise
  t: Translations;  // ✅ Removed DeepPartial - not needed here
  isLanguageLoaded: boolean;
};

const defaultLanguage: Language = 'en';

// Create context
const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: defaultLanguage,
  t: translations.en,
  isLanguageLoaded: true,
  setLanguage: async () => {},
});

// Provider component
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(defaultLanguage);
  const [t, setT] = useState<Translations>(translations[defaultLanguage]);
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedLang = await AsyncStorage.getItem('@language');
        if (storedLang && translations[storedLang as Language]) {
          setCurrentLanguage(storedLang as Language);
          setT(translations[storedLang as Language] as Translations);
        } else {
          const deviceLocale = getLocales()[0]?.languageCode as Language;
          if (translations[deviceLocale]) {
            setCurrentLanguage(deviceLocale);
            setT(translations[deviceLocale] as Translations);
          }
        }
      } catch (error) {
        console.error('Failed to load language from storage:', error);
      } finally {
        setIsLanguageLoaded(true);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    if (!translations[lang]) return;
    setCurrentLanguage(lang);
    setT(translations[lang] as Translations);
    try {
      await AsyncStorage.setItem('@language', lang);
    } catch (error) {
      console.error('Failed to save language to storage:', error);
    }
  }, []);

  const value = useMemo(() => ({ currentLanguage, t, setLanguage, isLanguageLoaded }), [currentLanguage, t, setLanguage, isLanguageLoaded]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Re-export the Language type for convenience
export type { Language };
