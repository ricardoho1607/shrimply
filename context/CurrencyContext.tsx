// context/CurrencyContext.tsx
// context/CurrencyContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@/translations';

// Supported currencies
export type Currency = 'USD' | 'AUD' | 'IDR' | 'THB' | 'CNY' | 'VND';

// Currency configuration
export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  flag: string;
  decimalPlaces: number;
  thousandSeparator: string;
  decimalSeparator: string;
}

// Currency definitions
export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    flag: '🇦🇺',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    flag: '🇮🇩',
    decimalPlaces: 0,
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  THB: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht',
    flag: '🇹🇭',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    flag: '🇨🇳',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    flag: '🇻🇳',
    decimalPlaces: 0,
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
};

// Language to currency mapping
export const LANGUAGE_TO_CURRENCY: Record<Language, Currency> = {
  en: 'USD',
  id: 'IDR',
  th: 'THB',
  zh: 'CNY',
  vi: 'VND',
};

// Context type
type CurrencyContextType = {
  currentCurrency: Currency;
  currencyConfig: CurrencyConfig;
  setCurrency: (currency: Currency) => Promise<void>;
  formatCurrency: (amount: number, options?: { showSymbol?: boolean; showCode?: boolean }) => string;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => Promise<void>;
  syncCurrencyWithLanguage: (language: Language) => Promise<void>;
  isCurrencyLoaded: boolean;
};

const defaultCurrency: Currency = 'IDR';

// Create context
const CurrencyContext = createContext<CurrencyContextType>({
  currentCurrency: defaultCurrency,
  currencyConfig: CURRENCIES[defaultCurrency],
  setCurrency: async () => {},
  formatCurrency: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  autoSyncEnabled: true,
  setAutoSyncEnabled: async () => {},
  syncCurrencyWithLanguage: async () => {},
  isCurrencyLoaded: true,
});

// Provider component
export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(defaultCurrency);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(true);
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>(CURRENCIES[defaultCurrency]);
  const [isCurrencyLoaded, setIsCurrencyLoaded] = useState(false);

  // Load currency settings from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedCurrency, storedAutoSync] = await Promise.all([
          AsyncStorage.getItem('@currency'),
          AsyncStorage.getItem('@currencyAutoSync'),
        ]);

        if (storedCurrency && CURRENCIES[storedCurrency as Currency]) {
          const currency = storedCurrency as Currency;
          setCurrentCurrency(currency);
          setCurrencyConfig(CURRENCIES[currency]);
        }

        if (storedAutoSync !== null) {
          setAutoSyncEnabledState(storedAutoSync === 'true');
        }
      } catch (error) {
        console.error('Failed to load currency settings from storage:', error);
      } finally {
        setIsCurrencyLoaded(true);
      }
    })();
  }, []);

  const applyCurrency = async (currency: Currency) => {
    setCurrentCurrency(currency);
    setCurrencyConfig(CURRENCIES[currency]);
    await AsyncStorage.setItem('@currency', currency);
  };

  // Set currency
  const setCurrency = async (currency: Currency) => {
    if (!CURRENCIES[currency]) return;

    try {
      await applyCurrency(currency);
      setAutoSyncEnabledState(false);
      await AsyncStorage.setItem('@currencyAutoSync', 'false');
    } catch (error) {
      console.error('Failed to save currency to storage:', error);
    }
  };

  // Set auto-sync enabled
  const setAutoSyncEnabled = async (enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    try {
      await AsyncStorage.setItem('@currencyAutoSync', enabled.toString());
    } catch (error) {
      console.error('Failed to save auto-sync setting to storage:', error);
    }
  };

  // Sync currency with language (called when language changes)
  const syncCurrencyWithLanguage = async (language: Language) => {
    if (!autoSyncEnabled) return;

    const newCurrency = LANGUAGE_TO_CURRENCY[language] || defaultCurrency;
    try {
      await applyCurrency(newCurrency);
    } catch (error) {
      console.error('Failed to sync currency with language:', error);
    }
  };

  // Format currency with proper separators and symbol
  const formatCurrency = (
    amount: number,
    options: { showSymbol?: boolean; showCode?: boolean } = { showSymbol: true, showCode: false }
  ): string => {
    const { showSymbol = true, showCode = false } = options;
    const config = CURRENCIES[currentCurrency];

    // Format the number with proper separators
    let formattedAmount: string;
    
    if (config.decimalPlaces === 0) {
      // No decimals (IDR, VND)
      formattedAmount = Math.round(amount)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
    } else {
      // With decimals (USD, THB, CNY)
      const parts = amount.toFixed(config.decimalPlaces).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
      formattedAmount = parts.join(config.decimalSeparator);
    }

    // Add symbol and/or code
    if (showSymbol && showCode) {
      return `${config.symbol} ${formattedAmount} ${config.code}`;
    } else if (showSymbol) {
      return `${config.symbol} ${formattedAmount}`;
    } else if (showCode) {
      return `${formattedAmount} ${config.code}`;
    } else {
      return formattedAmount;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        currencyConfig,
        setCurrency,
        formatCurrency,
        autoSyncEnabled,
        setAutoSyncEnabled,
        syncCurrencyWithLanguage,
        isCurrencyLoaded,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

// Hook to use currency context
export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Re-export types for convenience
export type { CurrencyContextType };
