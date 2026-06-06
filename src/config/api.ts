import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '../types';

const DEFAULT_API_BASE_URL = 'https://api.accounte.com/api';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const ensureApiBaseUrl = (value?: string): string => {
  const normalized = trimTrailingSlash(value || DEFAULT_API_BASE_URL);
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const API_BASE_URL = ensureApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
const FILE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

// API Configuration
const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  FILE_BASE_URL,
  ENDPOINTS: {
    // Authentication
    LOGIN: '/login',
    REGISTER: '/register',
    LOGOUT: '/logout',
    USER: '/user',
    REFRESH: '/refresh',

    // User Management
    PROFILE: '/profile',
    UPDATE_PROFILE: '/profile',
    CHANGE_PASSWORD: '/change-password',

    // Dashboard
    DASHBOARD: '/dashboard',
    DASHBOARD_STATS: '/dashboard/stats',

    // Transactions
    TRANSACTIONS: '/transactions',
    TRANSACTION_CREATE: '/transactions',
    TRANSACTION_UPDATE: '/transactions',
    TRANSACTION_DELETE: '/transactions',
    TRANSACTION_CATEGORIES: '/transactions/categories',
    TRANSACTION_PROCESS_RECEIPT: '/transactions/process-receipt',
    TRANSACTION_PROCESS_CSV: '/transactions/process-csv',
    TRANSACTION_BULK_CREATE: '/transactions/bulk-create',
    TRANSACTION_MERCHANTS: '/transactions/merchants',
    TRANSACTION_TRANSFER: '/transactions/transfer',

    // Categories
    CATEGORIES: '/categories',
    CATEGORIES_GROUPED: '/categories/grouped',
    CATEGORIES_DEFAULTS: '/categories/defaults',
    CATEGORIES_FOR_TRANSACTION: '/categories/for-transaction',
    CATEGORY_CREATE: '/categories',
    CATEGORY_UPDATE: '/categories',
    CATEGORY_DELETE: '/categories',
    CATEGORIES_ORDER: '/categories/order',

    // Subcategories
    SUBCATEGORIES: '/subcategories',

    // Accounts
    ACCOUNTS: '/accounts',
    ACCOUNT_CREATE: '/accounts',
    ACCOUNT_UPDATE: '/accounts',
    ACCOUNT_DELETE: '/accounts',
    ACCOUNT_BALANCE: '/accounts/balance',
    ACCOUNT_PAYMENT_METHODS: '/accounts/payment-methods',
    ACCOUNT_SET_DEFAULT: '/accounts',
    ACCOUNT_TRANSACTIONS: '/accounts',

    // Budgets
    BUDGETS: '/budgets',

    // Loans
    LOANS: '/loans',

    // Goals
    GOALS: '/goals',

    // Investments
    INVESTMENTS: '/investments',

    // Reports
    REPORTS: '/reports',
    REPORTS_MONTHLY_SUMMARY: '/reports/monthly-summary',
    REPORTS_CATEGORY_BREAKDOWN: '/reports/category-breakdown',
    REPORTS_NET_WORTH_TIMELINE: '/reports/net-worth-timeline',
    REPORTS_SUMMARY_STATS: '/reports/summary-stats',
    REPORTS_INCOME_STATEMENT: '/reports/income-statement',
    REPORTS_BALANCE_SHEET: '/reports/balance-sheet',

    // Chat
    CHAT_MESSAGES: '/chat/messages',
    CHAT_SAVE_EXPENSE: '/chat/messages',
    CHAT_TRANSCRIBE: '/chat/transcribe',

    // Schedules (repeating transactions)
    SCHEDULES: '/schedules',

    // Settings
    SETTINGS: '/settings',
    SETTINGS_UPDATE: '/settings',

    // Onboarding (first-time login wizard)
    ONBOARDING_STATUS: '/onboarding/status',
    ONBOARDING_COMPLETE: '/onboarding/complete',
    ONBOARDING_SKIP: '/onboarding/skip',

    // Devices (push notifications)
    DEVICES_REGISTER: '/devices/register',
    DEVICES_UNREGISTER: '/devices/unregister',

    // File uploads
    UPLOAD: '/upload',
    UPLOAD_AVATAR: '/upload/avatar',
    UPLOAD_DOCUMENT: '/upload/document',
  },
};

// Storage key for auth token
const AUTH_TOKEN_KEY = 'accounte_auth_token';

// Get auth token from secure storage
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

// Save auth token to secure storage
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    // Failed to save token
  }
};

// Remove auth token from secure storage
export const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    // Failed to remove token
  }
};

// Build full API URL
export const buildApiUrl = (endpoint: string): string => {
  if (!endpoint) {
    return API_CONFIG.BASE_URL;
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}${normalizedEndpoint}`;
};

// Build full URL for files (receipts, images, etc.)
export const buildFileUrl = (path: string | null | undefined): string | null => {
  if (!path || typeof path !== 'string') {
    return null;
  }

  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Local file URI (from camera/gallery)
  if (path.startsWith('file://') || path.startsWith('content://')) {
    return path;
  }

  if (path.includes('localhost') || path.includes('127.0.0.1')) {
    const match = path.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)/i);
    if (match && match[1]) {
      const normalizedLocalPath = match[1].replace(/^\/+/, '');
      return `${FILE_BASE_URL}/${normalizedLocalPath}`;
    }
  }

  // Relative path - prepend base URL
  const normalizedPath = path.replace(/^\/+/, '');
  return `${FILE_BASE_URL}/${normalizedPath}`;
};

// Get headers with auth token
export const getAuthHeaders = async (token?: string | null): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const authToken = token ?? (await getAuthToken());
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
};

// Default request timeout (ms). RN fetch has NO default timeout, so without
// this a stalled connection hangs the promise forever — leaving infinite
// spinners, dead-locked pagination, and permanently-disabled submit buttons.
const DEFAULT_TIMEOUT_MS = 20000;

// API request options
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  // A plain object is JSON-stringified automatically; pass FormData for uploads.
  body?: string | FormData | Record<string, unknown>;
  token?: string | null;
  headers?: HeadersInit;
  isFormData?: boolean;
  timeoutMs?: number;
}

// Common API request wrapper
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> => {
  const url = buildApiUrl(endpoint);
  const {
    method = 'GET',
    body,
    token,
    headers: customHeaders,
    isFormData = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const isForm = isFormData || (typeof FormData !== 'undefined' && body instanceof FormData);

  // Abort the request after timeoutMs so a hung connection rejects instead of
  // hanging forever.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const defaultHeaders = await getAuthHeaders(token);

    // Remove Content-Type for FormData (fetch sets it with the multipart boundary)
    const headers: Record<string, string> = isForm
      ? {
          Authorization: defaultHeaders.Authorization || '',
          Accept: 'application/json',
        }
      : { ...defaultHeaders, ...(customHeaders as Record<string, string> | undefined) };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined && body !== null && method !== 'GET') {
      // Serialize plain objects to JSON. Previously a non-string body was
      // assigned straight to fetch, which coerced it to the literal string
      // "[object Object]" — silently breaking e.g. push-device registration.
      fetchOptions.body =
        isForm || typeof body === 'string' ? (body as BodyInit) : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Parse defensively: read text first so an empty (204) or non-JSON body
    // (HTML 5xx/proxy error page) doesn't throw and lose the real status.
    const rawBody = await response.text();
    let data: unknown = undefined;
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = undefined; // non-JSON body (e.g. an HTML error page)
      }
    }

    const dataObj = (data ?? undefined) as { message?: string } | undefined;

    return {
      success: response.ok,
      status: response.status,
      data: data as T,
      message: dataObj?.message,
      error: !response.ok
        ? dataObj?.message || `Request failed (HTTP ${response.status})`
        : undefined,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      success: false,
      status: 0,
      error: aborted
        ? 'Request timed out. Please check your connection and try again.'
        : error instanceof Error
          ? error.message
          : 'Network error',
      data: undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export default API_CONFIG;
