import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Schedule, ApiResponse } from '../types';

export const scheduleService = {
  getAll: async (params: {
    status?: 'paid' | 'unpaid' | 'all';
    upcoming?: boolean;
  } = {}): Promise<ApiResponse<Schedule[]>> => {
    const token = await getAuthToken();
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const endpoint = queryString
      ? `${API_CONFIG.ENDPOINTS.SCHEDULES}?${queryString}`
      : API_CONFIG.ENDPOINTS.SCHEDULES;

    return apiRequest<Schedule[]>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getById: async (id: number): Promise<ApiResponse<Schedule>> => {
    const token = await getAuthToken();
    return apiRequest<Schedule>(`${API_CONFIG.ENDPOINTS.SCHEDULES}/${id}`, {
      method: 'GET',
      token,
    });
  },

  create: async (data: Partial<Schedule>): Promise<ApiResponse<Schedule>> => {
    const token = await getAuthToken();
    return apiRequest<Schedule>(API_CONFIG.ENDPOINTS.SCHEDULES, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: Partial<Schedule>): Promise<ApiResponse<Schedule>> => {
    const token = await getAuthToken();
    return apiRequest<Schedule>(`${API_CONFIG.ENDPOINTS.SCHEDULES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`${API_CONFIG.ENDPOINTS.SCHEDULES}/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

export default scheduleService;
