import { apiRequest } from '../config/api';
import { detectTimeZone } from '../utils/timezone';
import { User } from '../types';

export type WorkOSProvider = 'google' | 'apple' | 'facebook' | 'linkedin' | 'microsoft';

interface AuthorizationUrlOptions {
  provider?: WorkOSProvider;
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

const workosService = {
  async getAuthorizationUrl(
    options: AuthorizationUrlOptions = {}
  ): Promise<AuthorizationUrlResult> {
    const params = new URLSearchParams({ client: 'mobile', intent: options.intent ?? 'login' });
    if (options.provider) params.set('provider', options.provider);
    if (options.state) params.set('state', options.state);

    const response = await apiRequest(
      `/auth/workos/url?${params.toString()}`,
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
      const response = await apiRequest(`/auth/workos/exchange`, {
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
        message: message || response.error || 'Sign-in failed',
        requiresPasswordLogin: !!requiresPasswordLogin,
      };
    })();

    inFlightExchanges.set(code, promise);
    return promise;
  },
};

export default workosService;
