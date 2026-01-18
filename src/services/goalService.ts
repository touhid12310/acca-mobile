import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Goal, ApiResponse } from '../types';

export const goalService = {
  getAll: async (): Promise<ApiResponse<Goal[]>> => {
    const token = await getAuthToken();
    return apiRequest<Goal[]>(API_CONFIG.ENDPOINTS.GOALS, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Goal>> => {
    const token = await getAuthToken();
    return apiRequest<Goal>(`${API_CONFIG.ENDPOINTS.GOALS}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Goal>): Promise<ApiResponse<Goal>> => {
    const token = await getAuthToken();
    return apiRequest<Goal>(API_CONFIG.ENDPOINTS.GOALS, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Goal>): Promise<ApiResponse<Goal>> => {
    const token = await getAuthToken();
    return apiRequest<Goal>(`${API_CONFIG.ENDPOINTS.GOALS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.GOALS}/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  addAmount: async (
    id: number,
    amountData: { amount: number; date?: string; notes?: string }
  ): Promise<ApiResponse<Goal>> => {
    const token = await getAuthToken();
    return apiRequest<Goal>(`${API_CONFIG.ENDPOINTS.GOALS}/${id}/add-amount`, {
      method: 'POST',
      body: JSON.stringify(amountData),
      token,
    });
  },
};

export default goalService;
