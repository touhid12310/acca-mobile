import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { UserSettings, ApiResponse } from '../types';

export const settingsService = {
  get: async (): Promise<ApiResponse<UserSettings>> => {
    const token = await getAuthToken();
    return apiRequest<UserSettings>(API_CONFIG.ENDPOINTS.SETTINGS, {
      method: 'GET',
      token,
    });
  },

  update: async (data: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> => {
    const token = await getAuthToken();
    return apiRequest<UserSettings>(API_CONFIG.ENDPOINTS.SETTINGS_UPDATE, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },
};

export default settingsService;
