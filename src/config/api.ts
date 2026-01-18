import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '../types';

// API Configuration
const API_CONFIG = {
  BASE_URL: 'https://acca-api.autoaiassistant.com/api',
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

    // Bills
    BILLS: '/bills',
    BILL_CONVERT: '/bills/convert',

    // Settings
    SETTINGS: '/settings',
    SETTINGS_UPDATE: '/settings',

    // File uploads
    UPLOAD: '/upload',
    UPLOAD_AVATAR: '/upload/avatar',
    UPLOAD_DOCUMENT: '/upload/document',
  },
};

// Storage key for auth token
const AUTH_TOKEN_KEY = 'acca_auth_token';

// Get auth token from secure storage
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Save auth token to secure storage
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving auth token:', error);
  }
};

// Remove auth token from secure storage
export const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

// Build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
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

// API request options
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string | FormData;
  token?: string | null;
  headers?: HeadersInit;
  isFormData?: boolean;
}

// Common API request wrapper
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> => {
  const url = buildApiUrl(endpoint);
  const { method = 'GET', body, token, headers: customHeaders, isFormData = false } = options;

  try {
    const defaultHeaders = await getAuthHeaders(token);

    // Remove Content-Type for FormData (browser/fetch will set it with boundary)
    const headers: Record<string, string> = isFormData
      ? {
          Authorization: defaultHeaders.Authorization || '',
          Accept: 'application/json',
        }
      : { ...defaultHeaders, ...(customHeaders as Record<string, string> | undefined) };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data,
      message: data?.message,
      error: !response.ok ? data?.message || 'Request failed' : undefined,
    };
  } catch (error) {
    console.error('API Request Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      data: undefined,
    };
  }
};

export default API_CONFIG;
