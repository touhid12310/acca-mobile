import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { Goal, ApiResponse } from '../types';

/**
 * A goal as the API sends it (QA contract C3). `category` and `target_date`
 * are optional; `days_remaining` is whole days from the start of today in the
 * user's timezone (null without a target date), and an overdue goal says so
 * with `is_overdue` / `days_overdue`. Older API builds leave those out.
 */
export type GoalRecord = Omit<Goal, 'category' | 'target_date'> & {
  category?: string | null;
  target_date?: string | null;
  days_remaining?: number | null;
  is_overdue?: boolean;
  days_overdue?: number;
};

/** Create / edit body. `null` clears an optional field on edit. */
export type GoalInput = {
  name: string;
  target_amount: number;
  current_amount?: number;
  category?: string | null;
  target_date?: string | null;
  description?: string | null;
};

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

  create: async (data: GoalInput | Partial<Goal>): Promise<ApiResponse<Goal>> => {
    const token = await getAuthToken();
    return apiRequest<Goal>(API_CONFIG.ENDPOINTS.GOALS, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: async (id: number, data: GoalInput | Partial<Goal>): Promise<ApiResponse<Goal>> => {
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
    // from/to: also record the amount as a transfer between two accounts (QA AE-108).
    amountData: {
      amount: number;
      date?: string;
      notes?: string;
      from_account_id?: number;
      to_account_id?: number;
    }
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
