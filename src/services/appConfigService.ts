import { apiRequest } from '../config/api';

export interface PublicAppConfig {
  ios_url: string;
  android_url: string;
  /** Admin-set "Share AccountE" link; blank means use the store link. */
  share_url: string;
  share_message: string;
  deep_link: string;
  force_redirect: boolean;
  google_oauth: {
    web_client_id: string;
    ios_client_id: string;
    android_client_id: string;
  };
}

/**
 * Fetch the public, unauthenticated app config — exposes the Google OAuth
 * client IDs (per platform) so the mobile app can hand them to
 * expo-auth-session/providers/google. Backed by AdminSettingsController::publicAppConfig.
 */
export async function getPublicAppConfig(): Promise<PublicAppConfig | null> {
  try {
    const response = await apiRequest('/public/app-config', { method: 'GET' });
    if (!response.success || !response.data) {
      return null;
    }
    const data = response.data as Partial<PublicAppConfig>;
    return {
      ios_url: data.ios_url ?? '',
      android_url: data.android_url ?? '',
      share_url: data.share_url ?? '',
      share_message: data.share_message ?? '',
      deep_link: data.deep_link ?? 'accounte://',
      force_redirect: data.force_redirect ?? false,
      google_oauth: {
        web_client_id: data.google_oauth?.web_client_id ?? '',
        ios_client_id: data.google_oauth?.ios_client_id ?? '',
        android_client_id: data.google_oauth?.android_client_id ?? '',
      },
    };
  } catch {
    return null;
  }
}

let cachedConfig: PublicAppConfig | null = null;

/**
 * The same config, fetched once per app session — for taps like "Rate" and
 * "Share" that should feel instant. Existing callers keep the uncached fetch.
 */
export async function getCachedAppConfig(): Promise<PublicAppConfig | null> {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await getPublicAppConfig();
  return cachedConfig;
}

export default { getPublicAppConfig, getCachedAppConfig };
