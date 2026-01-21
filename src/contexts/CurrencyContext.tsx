import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import settingsService from '../services/settingsService';
import { CURRENCIES } from '../data/currencies';

interface Currency {
  code: string;
  label: string;
  symbol: string;
}

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  availableCurrencies: Currency[];
  isCurrencyLoading: boolean;
  isCurrencyUpdating: boolean;
  updatingCurrencyCode: string | null;
  updateCurrency: (code: string) => Promise<void>;
  refreshCurrency: () => Promise<void>;
  formatAmount: (amount: number, options?: FormatOptions) => string;
}

interface FormatOptions {
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const DEFAULT_CURRENCY = 'USD';
const STORAGE_KEY = 'acca:selected_currency';

const AVAILABLE_CURRENCIES: Currency[] = CURRENCIES.map(({ code, name, symbol }) => ({
  code,
  label: name,
  symbol: symbol || code,
}));

const SUPPORTED_CODES = new Set(AVAILABLE_CURRENCIES.map((c) => c.code));

const getCurrencyMeta = (code: string): Currency => {
  const found = AVAILABLE_CURRENCIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
  return found || { code, label: code, symbol: code };
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({
  children,
}) => {
  const { token, user } = useAuth();
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(false);
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const [updatingCurrencyCode, setUpdatingCurrencyCode] = useState<string | null>(
    null
  );

  // Load stored currency
  useEffect(() => {
    const loadStoredCurrency = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_CODES.has(stored.toUpperCase())) {
          setCurrency(stored.toUpperCase());
        }
      } catch (error) {
        console.error('Failed to load stored currency:', error);
      }
    };

    loadStoredCurrency();
  }, []);

  // Extract currency from various response formats
  const extractCurrency = (value: unknown): string | null => {
    if (!value) return null;

    if (typeof value === 'string') return value;

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.currency === 'string') return obj.currency;
      if (typeof obj.default_currency === 'string') return obj.default_currency;
      if (obj.settings && typeof (obj.settings as Record<string, unknown>).currency === 'string') {
        return (obj.settings as Record<string, unknown>).currency as string;
      }
      if (obj.preferences && typeof (obj.preferences as Record<string, unknown>).currency === 'string') {
        return (obj.preferences as Record<string, unknown>).currency as string;
      }
    }

    return null;
  };

  // Load currency preference from server
  const loadCurrencyPreference = useCallback(async () => {
    if (!token) {
      setCurrency(DEFAULT_CURRENCY);
      return;
    }

    setIsCurrencyLoading(true);
    try {
      const response = await settingsService.get();
      const payload = (response?.data as { data?: unknown })?.data ?? response?.data ?? response;
      const serverCurrency =
        extractCurrency(payload) ||
        extractCurrency(user) ||
        extractCurrency((user as { settings?: unknown })?.settings) ||
        DEFAULT_CURRENCY;

      const normalized = (serverCurrency || DEFAULT_CURRENCY).toUpperCase();
      setCurrency(normalized);
      await AsyncStorage.setItem(STORAGE_KEY, normalized);
    } catch (error) {
      console.error('Failed to load currency preference:', error);
      setCurrency(DEFAULT_CURRENCY);
    } finally {
      setIsCurrencyLoading(false);
    }
  }, [token, user]);

  // Load currency when token changes
  useEffect(() => {
    if (token) {
      loadCurrencyPreference();
    }
  }, [token, loadCurrencyPreference]);

  // Update currency preference
  const updateCurrency = useCallback(
    async (nextCurrency: string) => {
      const normalized = nextCurrency?.toUpperCase();
      if (
        !normalized ||
        normalized === currency ||
        !token ||
        !SUPPORTED_CODES.has(normalized)
      ) {
        return;
      }

      setIsCurrencyUpdating(true);
      setUpdatingCurrencyCode(normalized);

      try {
        const response = await settingsService.update({ currency: normalized });

        if (!response.success) {
          throw new Error('Failed to update currency');
        }

        const updated =
          extractCurrency((response?.data as { data?: unknown })?.data) || normalized;
        const finalCode = updated.toUpperCase();

        setCurrency(finalCode);
        await AsyncStorage.setItem(STORAGE_KEY, finalCode);
      } catch (error) {
        console.error('Currency update failed:', error);
      } finally {
        setIsCurrencyUpdating(false);
        setUpdatingCurrencyCode(null);
      }
    },
    [currency, token]
  );

  // Refresh currency
  const refreshCurrency = useCallback(async () => {
    if (token) {
      await loadCurrencyPreference();
    } else {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      setCurrency(stored || DEFAULT_CURRENCY);
    }
  }, [token, loadCurrencyPreference]);

  // Get currency symbol
  const currencySymbol = useMemo(
    () => getCurrencyMeta(currency).symbol || currency,
    [currency]
  );

  // Format amount with currency
  const formatAmount = useCallback(
    (amount: number, options: FormatOptions = {}) => {
      const {
        showSymbol = true,
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
      } = options;

      // Ensure amount is a valid number
      const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

      const formatted = safeAmount.toLocaleString(undefined, {
        minimumFractionDigits,
        maximumFractionDigits,
      });

      return showSymbol ? `${currencySymbol}${formatted}` : formatted;
    },
    [currencySymbol]
  );

  const value: CurrencyContextType = useMemo(
    () => ({
      currency,
      currencySymbol,
      availableCurrencies: AVAILABLE_CURRENCIES,
      isCurrencyLoading,
      isCurrencyUpdating,
      updatingCurrencyCode,
      updateCurrency,
      refreshCurrency,
      formatAmount,
    }),
    [
      currency,
      currencySymbol,
      isCurrencyLoading,
      isCurrencyUpdating,
      updatingCurrencyCode,
      updateCurrency,
      refreshCurrency,
      formatAmount,
    ]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
