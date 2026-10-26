import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { apiRequest } from '../config/api';

/**
 * The currency list the pickers offer, from `GET /currencies` (admin →
 * Currencies on the backend). The last good copy lives in AsyncStorage so a
 * launch shows it straight away; the app then refreshes it in the background —
 * once per launch, and again when it comes back to the foreground with a copy
 * older than STALE_AFTER_MS. A failed fetch (offline, or a backend without the
 * endpoint yet) keeps whatever copy we have, silently.
 */

export interface CatalogCurrency {
  code: string;
  name: string;
  /** Empty when the server has none; callers fall back (see CurrencyContext). */
  symbol: string;
  /** false = an admin turned it off: not offered, but still named for its users. */
  active: boolean;
}

export interface CurrencyCatalog {
  version: string | null;
  /** ms since epoch of the last successful fetch (or 304). */
  fetchedAt: number;
  /** In the server's order (sort_order, then code). */
  currencies: CatalogCurrency[];
}

export interface CurrencyCatalogState {
  catalog: CurrencyCatalog | null;
  /** A fetch is in flight. */
  loading: boolean;
  /** The last fetch failed (the cached copy, if any, is still in use). */
  failed: boolean;
}

interface CatalogPayload {
  default?: unknown;
  version?: unknown;
  currencies?: unknown;
}

const STORAGE_KEY = 'accounte:currency_catalog_v1';
const ENDPOINT = '/currencies';
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;
// Foreground refreshes after a failure wait this long, so flipping between
// apps while offline doesn't send a request every time.
const RETRY_GAP_MS = 60 * 1000;

const CODE_PATTERN = /^[A-Z]{3}$/;

/** A three-letter (ISO 4217-shaped) code, already upper-cased. */
export const isCurrencyCode = (code: string): boolean => CODE_PATTERN.test(code);

let state: CurrencyCatalogState = { catalog: null, loading: false, failed: false };
const listeners = new Set<() => void>();
let started = false;
let hydration: Promise<void> | null = null;
let inflight: Promise<void> | null = null;
let lastAttemptAt = 0;

const setState = (patch: Partial<CurrencyCatalogState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A listener's failure must not stop the others.
    }
  });
};

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Keeps well-formed rows only, in order, without duplicate codes. */
const parseCurrencies = (value: unknown): CatalogCurrency[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: CatalogCurrency[] = [];
  value.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const item = row as Record<string, unknown>;
    const code = asString(item.code).toUpperCase();
    if (!CODE_PATTERN.test(code) || seen.has(code)) return;
    seen.add(code);
    result.push({
      code,
      name: asString(item.name) || code,
      symbol: asString(item.symbol),
      active: item.active !== false && item.active !== 0,
    });
  });
  return result;
};

const readCache = async (): Promise<CurrencyCatalog | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurrencyCatalog> | null;
    const currencies = parseCurrencies(parsed?.currencies);
    if (currencies.length === 0) return null;
    return {
      version: asString(parsed?.version) || null,
      fetchedAt: typeof parsed?.fetchedAt === 'number' ? parsed.fetchedAt : 0,
      currencies,
    };
  } catch {
    return null;
  }
};

const writeCache = async (catalog: CurrencyCatalog): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // Storage full or unavailable: the in-memory copy still works this launch.
  }
};

const hydrate = (): Promise<void> => {
  if (!hydration) {
    hydration = readCache().then((cached) => {
      // A fetch that finished first is newer than the cache.
      if (cached && !state.catalog) setState({ catalog: cached });
    });
  }
  return hydration;
};

const fetchCatalog = async (): Promise<void> => {
  await hydrate();
  lastAttemptAt = Date.now();
  setState({ loading: true, failed: false });

  const current = state.catalog;
  let next: CurrencyCatalog | null = null;
  try {
    // The server sends the version as its ETag and answers 304 while it matches.
    const response = await apiRequest<CatalogPayload>(ENDPOINT, {
      method: 'GET',
      headers: current?.version ? { 'If-None-Match': `"${current.version}"` } : undefined,
    });

    if (response.status === 304 && current) {
      next = { ...current, fetchedAt: Date.now() };
    } else if (response.success) {
      // `{ success, data: { default, version, currencies } }`
      const body = response.data as { data?: CatalogPayload } | undefined;
      const payload = body?.data;
      const currencies = parseCurrencies(payload?.currencies);
      const version = asString(payload?.version) || null;
      if (currencies.length > 0) {
        // Same version: keep the old array so the pickers don't rebuild.
        next =
          current && version && version === current.version
            ? { ...current, fetchedAt: Date.now() }
            : { version, fetchedAt: Date.now(), currencies };
      }
    }
  } catch {
    next = null;
  }

  if (!next) {
    setState({ loading: false, failed: true });
    return;
  }

  await writeCache(next);
  setState({ catalog: next, loading: false, failed: false });
};

/** Fetches the list now (one request at a time). Never throws. */
export const refreshCurrencyCatalog = (): Promise<void> => {
  if (!inflight) {
    inflight = fetchCatalog()
      .catch(() => {
        setState({ loading: false, failed: true });
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

const isStale = (): boolean => {
  const catalog = state.catalog;
  return !catalog || Date.now() - catalog.fetchedAt > STALE_AFTER_MS;
};

/**
 * Loads the cached list and starts the background refresh: once now, and on
 * every return to the foreground while the copy is stale. Safe to call more
 * than once; only the first call does anything.
 */
export const startCurrencyCatalog = (): void => {
  if (started) return;
  started = true;

  hydrate().then(() => refreshCurrencyCatalog());

  AppState.addEventListener('change', (next) => {
    if (next !== 'active' || !isStale()) return;
    if (state.failed && Date.now() - lastAttemptAt < RETRY_GAP_MS) return;
    refreshCurrencyCatalog();
  });
};

export const getCurrencyCatalogState = (): CurrencyCatalogState => state;

export const subscribeCurrencyCatalog = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export default {
  start: startCurrencyCatalog,
  refresh: refreshCurrencyCatalog,
  getState: getCurrencyCatalogState,
  subscribe: subscribeCurrencyCatalog,
};
