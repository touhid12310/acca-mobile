import API_CONFIG, { apiRequest, saveAuthToken, removeAuthToken, getAuthToken } from '../config/api';
import { User, LoginResponse, RegisterResponse, ApiResponse } from '../types';
import { detectTimeZone } from '../utils/timezone';

export const authService = {
  login: async (
    email: string,
    password: string,
    twoFactorCode?: string
  ): Promise<ApiResponse<LoginResponse>> => {
    const body: Record<string, string> = { email, password, timezone: detectTimeZone() };
    if (twoFactorCode) {
      body.two_factor_code = twoFactorCode;
    }

    const result = await apiRequest<LoginResponse>(API_CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Save token on successful login
    if (result.success && result.data) {
      const data = result.data as LoginResponse;
      if (data.data?.access_token) {
        await saveAuthToken(data.data.access_token);
      }
    }

    return result;
  },

  register: async (
    name: string,
    email: string,
    mobile: string,
    password: string,
    confirmPassword: string
  ): Promise<ApiResponse<RegisterResponse>> => {
    const result = await apiRequest<RegisterResponse>(API_CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        mobile,
        password,
        confirm_password: confirmPassword,
        timezone: detectTimeZone(),
      }),
    });

    // Save token on successful registration
    if (result.success && result.data) {
      const data = result.data as RegisterResponse;
      if (data.data?.access_token) {
        await saveAuthToken(data.data.access_token);
      }
    }

    return result;
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

  forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ): Promise<ApiResponse<void>> => {
    return apiRequest<void>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      }),
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

  disableTwoFactor: async (password?: string): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>('/two-factor/disable', {
      method: 'POST',
      body: JSON.stringify(password ? { password } : {}),
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

  requestMagicLink: async (email: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>('/auth/magic/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyMagicLink: async (
    email: string,
    code: string,
    twoFactorCode?: string,
  ): Promise<ApiResponse<{ access_token: string; user: User }>> => {
    return apiRequest<{ access_token: string; user: User }>('/auth/magic/verify', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        timezone: detectTimeZone(),
        two_factor_code: twoFactorCode,
      }),
    });
  },

  // Link-based email verification. Mobile receives the link via deep link
  // `accounte://verify-email?token=X` → app/verify-email.tsx → verifyEmailLink.
  verifyEmailLink: async (
    token: string,
  ): Promise<ApiResponse<{ access_token: string; user: User }>> => {
    return apiRequest<{ access_token: string; user: User }>('/auth/email-link/verify', {
      method: 'POST',
      body: JSON.stringify({ token, timezone: detectTimeZone() }),
    });
  },

  resendEmailLink: async (email: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>('/auth/email-link/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Stubs — endpoints removed when WorkOS was retired. Profile screen still
  // calls these from a few legacy UI sections; these return graceful 410s.
  sendVerificationEmail: async (): Promise<ApiResponse<void>> => ({
    success: false,
    status: 410,
    data: { success: false, message: 'Email verification happens automatically via the link we email you on signup.' } as any,
  }),

  verifyEmail: async (_code: string): Promise<ApiResponse<void>> => ({
    success: false,
    status: 410,
    data: { success: false, message: 'Email verification happens automatically via the link we email you on signup.' } as any,
  }),

  getIdentities: async (): Promise<ApiResponse<{ identities: Array<Record<string, unknown>>; email_verified?: boolean }>> => ({
    success: false,
    status: 410,
    data: { success: false, message: 'Linked-identity listing is no longer available.', data: { identities: [] } } as any,
  }),

  deleteAccount: async (password?: string | null): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>('/account', {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: 'DELETE',
        ...(password ? { password } : {}),
      }),
      token,
    });
  },
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
