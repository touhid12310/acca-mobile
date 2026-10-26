import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import settingsService from '../services/settingsService';
import {
  type CatalogCurrency,
  getCurrencyCatalogState,
  isCurrencyCode,
  refreshCurrencyCatalog,
  startCurrencyCatalog,
  subscribeCurrencyCatalog,
} from '../services/currencyCatalog';

export interface Currency {
  code: string;
  label: string;
  symbol: string;
}

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  /** Active currencies from the server's list, in its order. Empty until it loads. */
  availableCurrencies: Currency[];
  /** Name and symbol for any code, including turned-off or unknown ones. */
  getCurrencyMeta: (code: string) => Currency;
  /** There is no list yet and one is on its way. */
  isCurrencyListLoading: boolean;
  /** Fetch the list again now (e.g. a picker opened with nothing to show). */
  reloadCurrencyList: () => void;
  isCurrencyLoading: boolean;
  isCurrencyUpdating: boolean;
  updatingCurrencyCode: string | null;
  /** Resolves true once the server has saved it (or it was already the currency). */
  updateCurrency: (code: string) => Promise<boolean>;
  refreshCurrency: () => Promise<void>;
  formatAmount: (amount: number | string | null | undefined, options?: FormatOptions) => string;
}

interface FormatOptions {
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const DEFAULT_CURRENCY = 'USD';
const STORAGE_KEY = 'accounte:selected_currency';

const normalizeCode = (code: string | null | undefined): string =>
  typeof code === 'string' ? code.trim().toUpperCase() : '';

// The device's own symbol for a code the list has no symbol for. Hermes' Intl
// support varies (narrowSymbol, formatToParts, or Intl itself may be missing),
// so every step is guarded and the answer is cached per code.
const intlSymbols = new Map<string, string | null>();

const intlCurrencySymbol = (code: string): string | null => {
  if (!isCurrencyCode(code)) return null;
  if (intlSymbols.has(code)) return intlSymbols.get(code) ?? null;

  let symbol: string | null = null;
  for (const currencyDisplay of ['narrowSymbol', 'symbol'] as const) {
    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        currencyDisplay,
      });
      const text =
        typeof formatter.formatToParts === 'function'
          ? formatter.formatToParts(0).find((part) => part.type === 'currency')?.value
          : formatter.format(0).replace(/[\d\s.,  ‎‏-]/g, '');
      if (text && text.trim()) {
        symbol = text.trim();
        break;
      }
    } catch {
      // Try the next display, then give up.
    }
  }

  intlSymbols.set(code, symbol);
  return symbol;
};

const toCurrency = (item: CatalogCurrency): Currency => ({
  code: item.code,
  label: item.name || item.code,
  symbol: item.symbol || intlCurrencySymbol(item.code) || item.code,
});

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

  // The server's currency list: cached copy first, refreshed in the background.
  const catalogState = useSyncExternalStore(
    subscribeCurrencyCatalog,
    getCurrencyCatalogState
  );
  const catalogCurrencies = catalogState.catalog?.currencies;

  useEffect(() => {
    startCurrencyCatalog();
  }, []);

  const catalogByCode = useMemo(() => {
    const map = new Map<string, CatalogCurrency>();
    (catalogCurrencies ?? []).forEach((item) => map.set(item.code, item));
    return map;
  }, [catalogCurrencies]);

  const availableCurrencies = useMemo<Currency[]>(
    () => (catalogCurrencies ?? []).filter((item) => item.active).map(toCurrency),
    [catalogCurrencies]
  );

  // Works for any code: a turned-off currency keeps its name and symbol, and
  // one the list doesn't know (or a list not loaded yet) falls back to the
  // device's symbol, then the code itself.
  const getCurrencyMeta = useCallback(
    (code: string): Currency => {
      const normalized = normalizeCode(code);
      const found = catalogByCode.get(normalized);
      if (found) return toCurrency(found);
      const fallback = normalized || code || '';
      return {
        code: fallback,
        label: fallback,
        symbol: intlCurrencySymbol(normalized) || fallback,
      };
    },
    [catalogByCode]
  );

  const isCurrencyListLoading = !catalogCurrencies?.length && !catalogState.failed;

  const reloadCurrencyList = useCallback(() => {
    refreshCurrencyCatalog();
  }, []);

  // Load stored currency. Any well-formed code is fine: the server decides
  // which currencies exist, and the list may not have loaded yet.
  useEffect(() => {
    const loadStoredCurrency = async () => {
      try {
        const stored = normalizeCode(await AsyncStorage.getItem(STORAGE_KEY));
        if (isCurrencyCode(stored)) {
          setCurrency(stored);
        }
      } catch {
        // Failed to load stored currency
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
    } catch {
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

  // Update currency preference. Codes aren't checked against the list here —
  // PUT /settings validates them (and refuses newly picked turned-off ones).
  const updateCurrency = useCallback(
    async (nextCurrency: string): Promise<boolean> => {
      const normalized = normalizeCode(nextCurrency);
      if (normalized && normalized === currency) {
        return true;
      }
      if (!token || !isCurrencyCode(normalized)) {
        return false;
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
        try {
          await AsyncStorage.setItem(STORAGE_KEY, finalCode);
        } catch {
          // The server has it; the local copy is only a launch-time hint.
        }
        return true;
      } catch {
        // Currency update failed
        return false;
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
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        stored = null;
      }
      setCurrency(stored || DEFAULT_CURRENCY);
    }
  }, [token, loadCurrencyPreference]);

  // Get currency symbol
  const currencySymbol = useMemo(
    () => getCurrencyMeta(currency).symbol || currency,
    [currency, getCurrencyMeta]
  );

  // Format amount with currency
  const formatAmount = useCallback(
    (amount: number | string | null | undefined, options: FormatOptions = {}) => {
      const {
        showSymbol = true,
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
      } = options;

      // Coerce to a number. The Laravel API serializes decimal columns as
      // STRINGS (e.g. "45.50"), so a strict number check would render every
      // such amount as 0.00. Accept numeric strings too.
      const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
      const safeAmount =
        typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : 0;

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
      availableCurrencies,
      getCurrencyMeta,
      isCurrencyListLoading,
      reloadCurrencyList,
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
      availableCurrencies,
      getCurrencyMeta,
      isCurrencyListLoading,
      reloadCurrencyList,
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
