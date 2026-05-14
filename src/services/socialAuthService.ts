import { apiRequest } from '../config/api';
import { detectTimeZone } from '../utils/timezone';
import { User } from '../types';

export type SocialProvider = 'google' | 'apple' | 'facebook' | 'linkedin' | 'microsoft';

interface AuthorizationUrlOptions {
  provider?: SocialProvider;
  intent?: 'login' | 'signup';
  state?: string;
}

interface AuthorizationUrlResult {
  success: boolean;
  url?: string;
  message?: string;
  status?: number;
}

interface ExchangeResult {
  success: boolean;
  user?: User | null;
  accessToken?: string;
  message?: string;
  status?: number;
  requiresPasswordLogin?: boolean;
  requiresTwoFactor?: boolean;
  pendingToken?: string;
}

interface VerifyTwoFactorResult {
  success: boolean;
  user?: User | null;
  accessToken?: string;
  message?: string;
  status?: number;
}

/**
 * apiRequest returns ApiResponse<T> where `data` is `T | { data: T; message?: string }`.
 * In practice Laravel wraps everything as `{ success, message, data: T }`, but the
 * generic shape isn't narrowed. Read fields via record indexing to keep TS happy.
 */
const readField = <T = unknown>(obj: unknown, key: string): T | undefined => {
  if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, T>)[key];
  }
  return undefined;
};

// Dedup in-flight exchange calls so the inline WebBrowser handler and the
// auth/callback.tsx deep-link handler don't both POST the same one-time code.
const inFlightExchanges = new Map<string, Promise<ExchangeResult>>();

const socialAuthService = {
  async getAuthorizationUrl(
    options: AuthorizationUrlOptions = {}
  ): Promise<AuthorizationUrlResult> {
    const params = new URLSearchParams({ client: 'mobile', intent: options.intent ?? 'login' });
    if (options.provider) params.set('provider', options.provider);
    if (options.state) params.set('state', options.state);

    const response = await apiRequest(
      `/auth/social/url?${params.toString()}`,
      { method: 'GET' }
    );

    const payload = response.data as Record<string, unknown> | undefined;
    const apiSuccess = readField<boolean>(payload, 'success');
    const message = readField<string>(payload, 'message');
    const inner = readField<Record<string, unknown>>(payload, 'data');
    const url = readField<string>(inner, 'url');

    if (response.success && apiSuccess && url) {
      return { success: true, url, status: response.status };
    }

    return {
      success: false,
      status: response.status,
      message: message || response.error || 'Could not start social sign-in',
    };
  },

  async exchange(code: string): Promise<ExchangeResult> {
    const existing = inFlightExchanges.get(code);
    if (existing) return existing;

    const promise = (async (): Promise<ExchangeResult> => {
      const response = await apiRequest(`/auth/social/exchange`, {
        method: 'POST',
        body: JSON.stringify({
          code,
          client: 'mobile',
          timezone: detectTimeZone(),
        }),
      });

      const payload = response.data as Record<string, unknown> | undefined;
      const apiSuccess = readField<boolean>(payload, 'success');
      const message = readField<string>(payload, 'message');
      const requiresPasswordLogin = readField<boolean>(
        payload,
        'requires_password_login'
      );
      const requires2faTop = readField<boolean>(payload, 'requires_two_factor');
      const inner = readField<Record<string, unknown>>(payload, 'data');
      const accessToken = readField<string>(inner, 'access_token');
      const user = readField<User>(inner, 'user') ?? null;
      const requires2faInner = readField<boolean>(inner, 'requires_two_factor');
      const pendingToken = readField<string>(inner, 'pending_token');

      if (requires2faTop || requires2faInner) {
        return {
          success: false,
          status: response.status,
          message: message || 'Two-factor authentication code required',
          requiresTwoFactor: true,
          pendingToken,
        };
      }

      if (response.success && apiSuccess && accessToken) {
        return {
          success: true,
          accessToken,
          user,
          message,
          status: response.status,
        };
      }

      return {
        success: false,
        status: response.status,
        message: message || response.error || 'Sign-in failed',
        requiresPasswordLogin: !!requiresPasswordLogin,
      };
    })();

    inFlightExchanges.set(code, promise);
    return promise;
  },

  /**
   * Native mobile path. expo-auth-session/providers/google handled the
   * OAuth dance on the device and gave us a Google id_token directly.
   * Backend verifies it via Google's tokeninfo endpoint and issues Sanctum
   * (or returns the 2FA challenge).
   */
  async exchangeIdToken(
    idToken: string,
    platform: 'ios' | 'android' | 'web' = 'ios',
  ): Promise<ExchangeResult> {
    const response = await apiRequest(`/auth/social/exchange-id-token`, {
      method: 'POST',
      body: JSON.stringify({
        id_token: idToken,
        platform,
        client: 'mobile',
        timezone: detectTimeZone(),
      }),
    });

    const payload = response.data as Record<string, unknown> | undefined;
    const apiSuccess = readField<boolean>(payload, 'success');
    const message = readField<string>(payload, 'message');
    const requiresPasswordLogin = readField<boolean>(payload, 'requires_password_login');
    const requires2faTop = readField<boolean>(payload, 'requires_two_factor');
    const inner = readField<Record<string, unknown>>(payload, 'data');
    const accessToken = readField<string>(inner, 'access_token');
    const user = readField<User>(inner, 'user') ?? null;
    const requires2faInner = readField<boolean>(inner, 'requires_two_factor');
    const pendingToken = readField<string>(inner, 'pending_token');

    if (requires2faTop || requires2faInner) {
      return {
        success: false,
        status: response.status,
        message: message || 'Two-factor authentication code required',
        requiresTwoFactor: true,
        pendingToken,
      };
    }

    if (response.success && apiSuccess && accessToken) {
      return { success: true, accessToken, user, message, status: response.status };
    }

    return {
      success: false,
      status: response.status,
      message: message || response.error || 'Sign-in failed',
      requiresPasswordLogin: !!requiresPasswordLogin,
    };
  },

  /**
   * Step-2 of social sign-in for 2FA-enabled users. The exchange call
   * returned `requires_two_factor: true` + a `pending_token`. The user
   * supplies the 6-digit code from their authenticator; submit both here.
   */
  async verifyTwoFactor(
    pendingToken: string,
    code: string,
  ): Promise<VerifyTwoFactorResult> {
    const response = await apiRequest(`/auth/social/verify-2fa`, {
      method: 'POST',
      body: JSON.stringify({ pending_token: pendingToken, code }),
    });

    const payload = response.data as Record<string, unknown> | undefined;
    const apiSuccess = readField<boolean>(payload, 'success');
    const message = readField<string>(payload, 'message');
    const inner = readField<Record<string, unknown>>(payload, 'data');
    const accessToken = readField<string>(inner, 'access_token');
    const user = readField<User>(inner, 'user') ?? null;

    if (response.success && apiSuccess && accessToken) {
      return {
        success: true,
        accessToken,
        user,
        message,
        status: response.status,
      };
    }

    return {
      success: false,
      status: response.status,
      message: message || response.error || 'Invalid code',
    };
  },
};

export default socialAuthService;
