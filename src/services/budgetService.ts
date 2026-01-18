import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Budget, ApiResponse } from '../types';

export const budgetService = {
  getAll: async (filters: {
    month?: string;
    year?: number;
  } = {}): Promise<ApiResponse<Budget[]>> => {
    const token = await getAuthToken();
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = params
      ? `${API_CONFIG.ENDPOINTS.BUDGETS}?${params}`
      : API_CONFIG.ENDPOINTS.BUDGETS;

    return apiRequest<Budget[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Budget>> => {
    const token = await getAuthToken();
    return apiRequest<Budget>(`${API_CONFIG.ENDPOINTS.BUDGETS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    const token = await getAuthToken();
    return apiRequest<Budget>(API_CONFIG.ENDPOINTS.BUDGETS, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    const token = await getAuthToken();
    return apiRequest<Budget>(`${API_CONFIG.ENDPOINTS.BUDGETS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.BUDGETS}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  getSummary: async (): Promise<
    ApiResponse<{
      total_budgeted: number;
      total_spent: number;
      remaining: number;
      budgets: Budget[];
    }>
  > => {
    const token = await getAuthToken();
    return apiRequest(`${API_CONFIG.ENDPOINTS.BUDGETS}/summary`, {
      method: 'GET',
      token,
    });
  },
};

export default budgetService;
