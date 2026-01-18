import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Bill, Transaction, ApiResponse } from '../types';

export const billService = {
  getAll: async (params: {
    status?: 'paid' | 'unpaid' | 'all';
    upcoming?: boolean;
  } = {}): Promise<ApiResponse<Bill[]>> => {
    const token = await getAuthToken();
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = queryString
      ? `${API_CONFIG.ENDPOINTS.BILLS}?${queryString}`
      : API_CONFIG.ENDPOINTS.BILLS;

    return apiRequest<Bill[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Bill>> => {
    const token = await getAuthToken();
    return apiRequest<Bill>(`${API_CONFIG.ENDPOINTS.BILLS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Bill>): Promise<ApiResponse<Bill>> => {
    const token = await getAuthToken();
    return apiRequest<Bill>(API_CONFIG.ENDPOINTS.BILLS, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Bill>): Promise<ApiResponse<Bill>> => {
    const token = await getAuthToken();
    return apiRequest<Bill>(`${API_CONFIG.ENDPOINTS.BILLS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.BILLS}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  convert: async (
    id: number,
    payload: {
      account_id?: number;
      payment_date?: string;
    }
  ): Promise<ApiResponse<Transaction>> => {
    const token = await getAuthToken();
    return apiRequest<Transaction>(`${API_CONFIG.ENDPOINTS.BILLS}/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });
  },
};

export default billService;
