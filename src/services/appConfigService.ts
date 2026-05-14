import { apiRequest } from '../config/api';

export interface PublicAppConfig {
  ios_url: string;
  android_url: string;
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

export default { getPublicAppConfig };
