import API_CONFIG, { apiRequest, saveAuthToken, removeAuthToken, getAuthToken } from '../config/api';
import { User, LoginResponse, RegisterResponse, ApiResponse } from '../types';

export const authService = {
  login: async (
    email: string,
    password: string,
    twoFactorCode?: string
  ): Promise<ApiResponse<LoginResponse>> => {
    const body: Record<string, string> = { email, password };
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
    password: string,
    confirmPassword: string
  ): Promise<ApiResponse<RegisterResponse>> => {
    const result = await apiRequest<RegisterResponse>(API_CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        confirm_password: confirmPassword,
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

  disableTwoFactor: async (password: string): Promise<ApiResponse<void>> => {
    const token = await getAuthToken();
    return apiRequest<void>('/two-factor/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
      token,
    });
  },
};

export default authService;
