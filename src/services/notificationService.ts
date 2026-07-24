import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse } from '../types';

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationFeed = {
  items: AppNotification[];
  unread_count: number;
};

export const notificationService = {
  list: async (): Promise<ApiResponse<{ data: NotificationFeed }>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.NOTIFICATIONS, {
      method: 'GET',
      token,
    });
  },

  unreadCount: async (): Promise<ApiResponse<{ data: { unread_count: number } }>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT, {
      method: 'GET',
      token,
    });
  },

  markRead: async (id: number): Promise<ApiResponse<unknown>> => {
    const token = await getAuthToken();
    return apiRequest(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${id}/read`, {
      method: 'POST',
      token,
    });
  },

  markAllRead: async (): Promise<ApiResponse<unknown>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.NOTIFICATIONS_READ_ALL, {
      method: 'POST',
      token,
    });
  },

  remove: async (id: number): Promise<ApiResponse<unknown>> => {
    const token = await getAuthToken();
    return apiRequest(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

export default notificationService;
