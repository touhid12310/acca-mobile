import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Account, Transaction, ApiResponse } from '../types';

export const accountService = {
  getAll: async (type?: string): Promise<ApiResponse<Account[]>> => {
    const token = await getAuthToken();
    const endpoint = type
      ? `${API_CONFIG.ENDPOINTS.ACCOUNTS}?type=${type}`
      : API_CONFIG.ENDPOINTS.ACCOUNTS;

    return apiRequest<Account[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Account>> => {
    const token = await getAuthToken();
    return apiRequest<Account>(`${API_CONFIG.ENDPOINTS.ACCOUNTS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Account>): Promise<ApiResponse<Account>> => {
    const token = await getAuthToken();
    return apiRequest<Account>(API_CONFIG.ENDPOINTS.ACCOUNT_CREATE, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Account>): Promise<ApiResponse<Account>> => {
    const token = await getAuthToken();
    return apiRequest<Account>(`${API_CONFIG.ENDPOINTS.ACCOUNT_UPDATE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.ACCOUNT_DELETE}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  getBalance: async (id: number): Promise<ApiResponse<{ balance: number }>> => {
    const token = await getAuthToken();
    return apiRequest<{ balance: number }>(`${API_CONFIG.ENDPOINTS.ACCOUNT_BALANCE}/${id}`, {
      method: 'GET',
      token,
    });
  },

  getTransactions: async (id: number): Promise<ApiResponse<Transaction[]>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction[]>(
      `${API_CONFIG.ENDPOINTS.ACCOUNT_TRANSACTIONS}/${id}/transactions`,
      {
        method: 'GET',
        token,
      }
    );
  },

  getPaymentMethods: async (): Promise<ApiResponse<Account[]>> => {
    const token = await getAuthToken();
    return apiRequest<Account[]>(API_CONFIG.ENDPOINTS.ACCOUNT_PAYMENT_METHODS, {
      method: 'GET',
      token,
    });
  },
};

export default accountService;
