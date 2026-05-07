import API_CONFIG, { apiRequest, getAuthToken } from '../config/api';
import { ApiResponse, User } from '../types';

export interface OnboardingPayload {
  display_name: string;
  currency: string;
  timezone?: string | null;
  financial_month_start_day: number;
  profile_type: 'personal' | 'freelancer' | 'family' | 'business';
  load_sample_data?: boolean;
  account?: {
    account_name: string;
    type: string;
    current_balance?: number;
  } | null;
}

export const onboardingService = {
  status: async (): Promise<ApiResponse<{ completed: boolean; completed_at: string | null; profile_type: string | null; financial_month_start_day: number; }>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.ONBOARDING_STATUS, {
      method: 'GET',
      token,
    });
  },

  complete: async (payload: OnboardingPayload): Promise<ApiResponse<{ user: User; completed_at: string | null }>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.ONBOARDING_COMPLETE, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });
  },

  skip: async (): Promise<ApiResponse<{ user: User; completed_at: string | null }>> => {
    const token = await getAuthToken();
    return apiRequest(API_CONFIG.ENDPOINTS.ONBOARDING_SKIP, {
      method: 'POST',
      token,
    });
  },
};

export default onboardingService;
