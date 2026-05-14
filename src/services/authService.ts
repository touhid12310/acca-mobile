import API_CONFIG, { apiRequest, saveAuthToken, removeAuthToken, getAuthToken } from '../config/api';
import { User, LoginResponse, RegisterResponse, ApiResponse } from '../types';
import { detectTimeZone } from '../utils/timezone';

export const authService = {
  // ── Email-code sign-in (replaces password login + register) ──
  // Single passwordless flow: request a 6-digit code, then submit it. First-
  // time submission creates the user — there is no separate registration.
  requestEmailCode: async (email: string, name?: string): Promise<ApiResponse<{ email: string }>> => {
    return apiRequest<{ email: string }>('/auth/email-code/request', {
      method: 'POST',
      body: JSON.stringify({ email, ...(name ? { name } : {}) }),
    });
  },

  verifyEmailCode: async (
    email: string,
    code: string,
    name?: string,
  ): Promise<ApiResponse<{ access_token: string; user: User }>> => {
    return apiRequest<{ access_token: string; user: User }>('/auth/email-code/verify', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        timezone: detectTimeZone(),
        ...(name ? { name } : {}),
      }),
    });
  },

  // ── Google OAuth (custom — no Socialite, no WorkOS) ──
  googleAuthorizationUrl: async (
    redirectUri: string,
    intent: 'login' | 'signup' = 'login',
  ): Promise<ApiResponse<{ url: string; state: string }>> => {
    const params = new URLSearchParams({ redirect_uri: redirectUri, intent });
    return apiRequest<{ url: string; state: string }>(`/auth/google/url?${params.toString()}`, {
      method: 'GET',
    });
  },

  googleExchange: async (
    code: string,
    state: string,
    redirectUri: string,
  ): Promise<ApiResponse<{ access_token: string; user: User }>> => {
    return apiRequest<{ access_token: string; user: User }>('/auth/google/exchange', {
      method: 'POST',
      body: JSON.stringify({
        code,
        state,
        redirect_uri: redirectUri,
        timezone: detectTimeZone(),
      }),
    });
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    const result = await apiRequest<void>(API_CONFIG.ENDPOINTS.LOGOUT, {
      method: 'POST',
      token,
    });

    // Always remove token on logout attempt
    await removeAuthToken();

    return result;
  },

  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const token = await getAuthToken();
    return apiRequest<{ user: User }>(API_CONFIG.ENDPOINTS.PROFILE, {
      method: 'GET',
      token,
    });
  },

  getUser: async (): Promise<ApiResponse<User>> => {
    const token = await getAuthToken();
    return apiRequest<User>(API_CONFIG.ENDPOINTS.USER, {
      method: 'GET',
      token,
    });
  },

  updateProfile: async (profileData: Partial<User>): Promise<ApiResponse<User>> => {
    const token = await getAuthToken();
    return apiRequest<User>(API_CONFIG.ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
      token,
    });
  },

  changePassword: async (passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
      method: 'POST',
      body: JSON.stringify(passwordData),
      token,
    });
  },

  // Two-Factor Authentication
  getTwoFactorStatus: async (): Promise<ApiResponse<{ enabled: boolean }>> => {
    const token = await getAuthToken();
    return apiRequest<{ enabled: boolean }>('/two-factor/status', {
      method: 'GET',
      token,
    });
  },

  setupTwoFactor: async (): Promise<ApiResponse<{ qr_code: string; secret: string }>> => {
    const token = await getAuthToken();
    return apiRequest<{ qr_code: string; secret: string }>('/two-factor/setup', {
      method: 'POST',
      token,
    });
  },

  verifyTwoFactor: async (code: string): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>('/two-factor/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
      token,
    });
  },

  disableTwoFactor: async (password: string): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>('/two-factor/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
      token,
    });
  },

  // Session Management
  validateSession: async (): Promise<ApiResponse<{ valid: boolean; user: User }>> => {
    const token = await getAuthToken();
    return apiRequest<{ valid: boolean; user: User }>('/sessions/validate', {
      method: 'GET',
      token,
    });
  },

  getSessions: async (): Promise<ApiResponse<{ sessions: Session[]; total: number }>> => {
    const token = await getAuthToken();
    return apiRequest<{ sessions: Session[]; total: number }>('/sessions', {
      method: 'GET',
      token,
    });
  },

  revokeSession: async (sessionId: number): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
      token,
    });
  },

  revokeOtherSessions: async (): Promise<ApiResponse<{ revoked_count: number }>> => {
    const token = await getAuthToken();
    return apiRequest<{ revoked_count: number }>('/sessions', {
      method: 'DELETE',
      token,
    });
  },

  // Account deletion. Passwordless mode — Sanctum token is the proof; the
  // password parameter (if any) is ignored. Caller must still send confirm.
  deleteAccount: async (_password?: string): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>('/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
      token,
    });
  },

  // Stubs — endpoints removed when WorkOS was stripped. The mobile profile
  // screen still calls these from a few legacy UI sections; these no-ops
  // avoid runtime errors until those sections are cleaned up.
  getIdentities: async (): Promise<ApiResponse<{ identities: Array<Record<string, unknown>>; email_verified?: boolean }>> => ({
    success: false,
    status: 410,
    data: {
      success: false,
      message: 'Linked-identity listing is no longer available.',
      data: { identities: [] },
    } as any,
  }),

  sendVerificationEmail: async (): Promise<ApiResponse<void>> => ({
    success: false,
    status: 410,
    data: {
      success: false,
      message: 'Email verification happens automatically when you sign in with the email code.',
    } as any,
  }),

  verifyEmail: async (_code: string): Promise<ApiResponse<void>> => ({
    success: false,
    status: 410,
    data: {
      success: false,
      message: 'Email verification happens automatically when you sign in with the email code.',
    } as any,
  }),
};

// Session type for session management
export interface Session {
  id: number;
  device_name: string;
  ip_address: string;
  user_agent: string | null;
  browser: string;
  platform: string;
  last_active: string;
  last_active_at: string | null;
  created_at: string;
  is_current: boolean;
}

export default authService;
